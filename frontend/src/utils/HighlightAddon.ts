import { Terminal, ITerminalAddon, IDisposable, IDecoration } from '@xterm/xterm';
import { HighlightRuleConfig, normalizeHexColor, DEFAULT_HIGHLIGHT_RULES } from '../constants/defaultHighlightRules';

interface CompiledRule {
  config: HighlightRuleConfig;
  regex: RegExp;
  fgColor?: string;
  bgColor?: string;
}

const MAX_ACTIVE_DECORATIONS = 2500;

export class HighlightAddon implements ITerminalAddon {
  private _terminal: Terminal | null = null;
  private _disposables: IDisposable[] = [];
  private _enabled: boolean = true;
  private _rules: HighlightRuleConfig[] = [];
  private _compiledRules: CompiledRule[] = [];
  private _decorationsByLine: Map<number, IDecoration[]> = new Map();
  private _lineContentCache: Map<number, string> = new Map();
  private _isScanning: boolean = false;
  private _lastScanTime: number = 0;
  private _rafId: number | null = null;
  private _pendingMinRow: number = 0;
  private _pendingMaxRow: number = 0;
  private _hasPendingScan: boolean = false;
  private _isAlternateBuffer: boolean = false;

  constructor(initialRules: HighlightRuleConfig[] = DEFAULT_HIGHLIGHT_RULES, enabled: boolean = true) {
    this._enabled = enabled;
    this.setRules(initialRules.length > 0 ? initialRules : DEFAULT_HIGHLIGHT_RULES);
  }

  public activate(terminal: Terminal): void {
    this._terminal = terminal;
    this._isAlternateBuffer = terminal.buffer.active.type === 'alternate';

    // 监听视口行渲染事件 (增加重入锁保护与防抖，彻底消除 onRender -> registerDecoration 自激死循环)
    this._disposables.push(
      terminal.onRender((e: { start: number; end: number }) => {
        if (!this._enabled || this._isAlternateBuffer || this._isScanning) return;
        this._scheduleScan(e.start, e.end);
      })
    );

    // 监听终端缓冲区切换 (vim/htop/nano 全屏应用智能避让)
    this._disposables.push(
      terminal.buffer.onBufferChange((buf) => {
        const isAlt = buf.type === 'alternate';
        if (this._isAlternateBuffer !== isAlt) {
          this._isAlternateBuffer = isAlt;
          if (isAlt) {
            // 进入全屏模式，清空高亮避免干扰
            this.clearDecorations();
          } else {
            // 回到正常终端模式，恢复全视口高亮
            if (this._enabled && this._terminal) {
              this._scheduleScan(0, this._terminal.rows - 1);
            }
          }
        }
      })
    );

    // 监听视口大小变化
    this._disposables.push(
      terminal.onResize(() => {
        if (this._enabled && !this._isAlternateBuffer && this._terminal) {
          this._scheduleScan(0, this._terminal.rows - 1);
        }
      })
    );

    // 初始首次扫描视口
    if (this._enabled && !this._isAlternateBuffer) {
      this._scheduleScan(0, terminal.rows - 1);
    }
  }

  public setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return;
    this._enabled = enabled;
    if (!enabled) {
      this.clearDecorations();
    } else if (this._terminal && !this._isAlternateBuffer) {
      this._scheduleScan(0, this._terminal.rows - 1);
    }
  }

  public isEnabled(): boolean {
    return this._enabled;
  }

  public setRules(rules: HighlightRuleConfig[]): void {
    this._rules = rules;
    this._compiledRules = [];

    for (const r of rules) {
      if (!r.enabled || !r.pattern) continue;
      try {
        const flags = r.ignoreCase ? 'gi' : 'g';
        const regex = new RegExp(r.pattern, flags);
        const fgColor = normalizeHexColor(r.color);
        const bgColor = normalizeHexColor(r.bgColor);
        if (fgColor || bgColor) {
          this._compiledRules.push({
            config: r,
            regex,
            fgColor,
            bgColor,
          });
        }
      } catch (e) {
        // 忽略无效的用户自定义正则，防止抛出错误中断终端交互
      }
    }

    if (this._enabled && this._terminal && !this._isAlternateBuffer) {
      this.clearDecorations();
      this._scheduleScan(0, this._terminal.rows - 1);
    }
  }

  public getRules(): HighlightRuleConfig[] {
    return this._rules;
  }

  public refresh(): void {
    if (!this._enabled || !this._terminal || this._isAlternateBuffer) return;
    this.clearDecorations();
    this._scheduleScan(0, this._terminal.rows - 1);
  }

  public clearDecorations(): void {
    for (const decos of this._decorationsByLine.values()) {
      for (const d of decos) {
        try {
          d.dispose();
        } catch {
          // ignore
        }
      }
    }
    this._decorationsByLine.clear();
    this._lineContentCache.clear();
  }

  private _scheduleScan(startRow: number = 0, endRow?: number): void {
    if (!this._terminal) return;
    const maxRow = endRow !== undefined ? endRow : this._terminal.rows - 1;

    if (!this._hasPendingScan) {
      this._pendingMinRow = startRow;
      this._pendingMaxRow = maxRow;
      this._hasPendingScan = true;
    } else {
      this._pendingMinRow = Math.min(this._pendingMinRow, startRow);
      this._pendingMaxRow = Math.max(this._pendingMaxRow, maxRow);
    }

    if (this._rafId !== null) return;

    // 节流阀：控制在 80ms 以内最多执行一次扫描，避免高频自激振荡
    const now = performance.now();
    const delay = Math.max(0, 80 - (now - this._lastScanTime));

    const run = () => {
      this._rafId = null;
      this._lastScanTime = performance.now();
      if (!this._hasPendingScan || !this._terminal || !this._enabled || this._isAlternateBuffer) {
        this._hasPendingScan = false;
        return;
      }
      const min = Math.max(0, this._pendingMinRow);
      const max = Math.min(this._terminal.rows - 1, this._pendingMaxRow);
      this._hasPendingScan = false;
      this._scanRows(min, max);
    };

    if (delay <= 0) {
      this._rafId = requestAnimationFrame(run);
    } else {
      this._rafId = window.setTimeout(() => {
        this._rafId = requestAnimationFrame(run);
      }, delay) as unknown as number;
    }
  }

  private _scanRows(startViewportRow: number, endViewportRow: number): void {
    if (!this._terminal || this._compiledRules.length === 0 || this._isScanning) return;
    this._isScanning = true;

    try {
      const buffer = this._terminal.buffer.active;
      const baseY = buffer.baseY;

      for (let r = startViewportRow; r <= endViewportRow; r++) {
        const bufferRow = baseY + r;
        const line = buffer.getLine(bufferRow);
        if (!line) continue;

        const text = line.translateToString(true);

        // 核心性能守护：若该行文本未发生实质变化，跳过重新注册，彻底斩断 render 死循环
        if (this._lineContentCache.get(bufferRow) === text) {
          continue;
        }

        // 行文本发生变更，清理已有这行的 decorations 避免堆叠
        const existing = this._decorationsByLine.get(bufferRow);
        if (existing) {
          for (const d of existing) {
            try {
              d.dispose();
            } catch {
              // ignore
            }
          }
          this._decorationsByLine.delete(bufferRow);
        }

        this._lineContentCache.set(bufferRow, text);
        if (!text || text.trim().length === 0) continue;

        const lineDecorations: IDecoration[] = [];

        // 遍历所有已编译规则
        for (const rule of this._compiledRules) {
          rule.regex.lastIndex = 0;
          let match: RegExpExecArray | null = null;
          let matchCount = 0;

          while ((match = rule.regex.exec(text)) !== null && matchCount < 20) {
            matchCount++;
            const matchIndex = match.index;
            const matchLen = match[0].length;
            if (matchLen === 0) {
              rule.regex.lastIndex++;
              continue;
            }

            // 将字符偏移转化为准确的单元格 (Cell) 列位置，支持 CJK 全角字符对齐
            const startCol = this._stringLengthToBufferSize(line, matchIndex);
            const endCol = this._stringLengthToBufferSize(line, matchIndex + matchLen);
            const colWidth = endCol - startCol;

            if (colWidth <= 0 || startCol >= this._terminal.cols) continue;

            const markerOffset = -buffer.baseY - buffer.cursorY + bufferRow;
            const marker = this._terminal.registerMarker(markerOffset);

            if (marker) {
              const decoration = this._terminal.registerDecoration({
                marker,
                x: startCol,
                width: Math.min(colWidth, this._terminal.cols - startCol),
                foregroundColor: rule.fgColor,
                backgroundColor: rule.bgColor,
                layer: 'top',
                overviewRulerOptions: rule.config.showInRuler ? {
                  color: rule.config.rulerColor || rule.fgColor || '#f14c4c',
                  position: 'full',
                } : undefined,
              });

              if (decoration) {
                marker.onDispose(() => {
                  const decs = this._decorationsByLine.get(bufferRow);
                  if (decs) {
                    const idx = decs.indexOf(decoration);
                    if (idx !== -1) decs.splice(idx, 1);
                    if (decs.length === 0) this._decorationsByLine.delete(bufferRow);
                  }
                });
                lineDecorations.push(decoration);
              } else {
                marker.dispose();
              }
            }
          }
        }

        if (lineDecorations.length > 0) {
          this._decorationsByLine.set(bufferRow, lineDecorations);
        }
      }

      // 内存防护：若总体 Decoration 行数超出天花板，优先清理离可视区最远的行
      if (this._decorationsByLine.size > MAX_ACTIVE_DECORATIONS) {
        this._pruneDistantDecorations(baseY);
      }
    } finally {
      this._isScanning = false;
    }
  }

  private _pruneDistantDecorations(currentBaseY: number): void {
    const keys = Array.from(this._decorationsByLine.keys());
    keys.sort((a, b) => Math.abs(b - currentBaseY) - Math.abs(a - currentBaseY));
    const toRemoveCount = this._decorationsByLine.size - MAX_ACTIVE_DECORATIONS;
    for (let i = 0; i < toRemoveCount && i < keys.length; i++) {
      const lineKey = keys[i];
      const decs = this._decorationsByLine.get(lineKey);
      if (decs) {
        for (const d of decs) {
          try {
            d.dispose();
          } catch {
            // ignore
          }
        }
      }
      this._decorationsByLine.delete(lineKey);
      this._lineContentCache.delete(lineKey);
    }
  }

  /**
   * 将字符串字符偏移转换为终端字符单元格列宽 (校正 emoji 与 CJK 全角双宽度字符)
   */
  private _stringLengthToBufferSize(line: any, offset: number): number {
    let cellOffset = offset;
    for (let i = 0; i < cellOffset; i++) {
      const cell = line.getCell(i);
      if (!cell) break;
      const chars = cell.getChars();
      if (chars.length > 1) {
        cellOffset -= chars.length - 1;
      }
      const nextCell = line.getCell(i + 1);
      if (nextCell && nextCell.getWidth() === 0) {
        cellOffset++;
      }
    }
    return cellOffset;
  }

  public dispose(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.clearDecorations();
    for (const d of this._disposables) {
      try {
        d.dispose();
      } catch {
        // ignore
      }
    }
    this._disposables = [];
    this._terminal = null;
  }
}
