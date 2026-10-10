import React, { useRef, useCallback } from 'react';

interface TerminalSearchMinimapProps {
  isOpen: boolean;
  matchLines: number[];
  totalLines: number;
  viewportY: number;
  viewportRows: number;
  onScrollToLine: (line: number) => void;
  currentMatchIndex?: number;
}

export function TerminalSearchMinimap({
  isOpen,
  matchLines,
  totalLines,
  viewportY,
  viewportRows,
  onScrollToLine,
  currentMatchIndex = -1,
}: TerminalSearchMinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击迷你地图任意位置或色块进行跳转
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || totalLines <= 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const ratio = Math.max(0, Math.min(1, clickY / rect.height));
      const targetLine = Math.floor(ratio * totalLines);

      // 寻找最近的匹配行，若距离很近则精准对齐到该匹配行
      if (matchLines.length > 0) {
        let closest = matchLines[0];
        let minDiff = Math.abs(closest - targetLine);
        for (let i = 1; i < matchLines.length; i++) {
          const diff = Math.abs(matchLines[i] - targetLine);
          if (diff < minDiff) {
            minDiff = diff;
            closest = matchLines[i];
          }
        }
        // 如果点击位置距离最近匹配行不到 5 行，则精确吸附到该行
        if (minDiff <= 5) {
          onScrollToLine(closest);
          return;
        }
      }

      onScrollToLine(targetLine);
    },
    [totalLines, matchLines, onScrollToLine]
  );

  if (!isOpen || totalLines <= 0) return null;

  // 计算视口滑块的位置和高度
  const safeTotal = Math.max(totalLines, 1);
  const viewportTopPercent = Math.min(100, Math.max(0, (viewportY / safeTotal) * 100));
  const viewportHeightPercent = Math.min(
    100,
    Math.max(2, (viewportRows / safeTotal) * 100)
  );

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      title="搜索结果迷你地图 (点击定位)"
      className="absolute top-0 right-0 bottom-0 w-3 bg-[#181818]/75 hover:bg-[#181818]/95 border-l border-[#2b2b2b] z-30 transition-all select-none cursor-pointer group"
    >
      {/* 视口高亮区域 */}
      <div
        className="absolute left-0 right-0 bg-[#0078d4]/25 border-y border-[#0078d4]/40 pointer-events-none transition-all duration-75"
        style={{
          top: `${viewportTopPercent}%`,
          height: `${viewportHeightPercent}%`,
        }}
      />

      {/* 匹配项标记 */}
      {matchLines.map((line, idx) => {
        const topPercent = Math.min(99.5, Math.max(0.5, (line / safeTotal) * 100));
        const isCurrent = idx === currentMatchIndex;

        return (
          <div
            key={`${line}-${idx}`}
            onClick={(e) => {
              e.stopPropagation();
              onScrollToLine(line);
            }}
            title={`第 ${line + 1} 行匹配项 (点击跳转)`}
            className={`absolute left-0.5 right-0.5 rounded-full transition-transform cursor-pointer ${
              isCurrent
                ? 'h-[4px] bg-amber-300 ring-2 ring-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,1)] z-10 scale-125'
                : 'h-[2.5px] bg-amber-400/80 hover:bg-amber-300 shadow-[0_0_4px_rgba(251,191,36,0.6)] hover:scale-150'
            }`}
            style={{
              top: `${topPercent}%`,
            }}
          />
        );
      })}

      {/* 底部匹配总数指示气泡（鼠标悬浮时展开） */}
      {matchLines.length > 0 && (
        <div className="opacity-0 group-hover:opacity-100 absolute bottom-2 right-4 pointer-events-none bg-[#252526] border border-[#2b2b2b] text-[10px] text-amber-300 px-2 py-0.5 rounded shadow-lg whitespace-nowrap transition-opacity">
          共 {matchLines.length} 处匹配
        </div>
      )}
    </div>
  );
}
