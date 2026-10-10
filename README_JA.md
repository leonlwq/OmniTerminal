<p align="center">
  <img src="./build/appicon.png" alt="OmniTerminal アイコン" width="120" height="120" />
</p>

<h1 align="center">OmniTerminal</h1>

<p align="center">
  インフラ運用およびシステム開発向けの高パフォーマンスなクロスプラットフォーム SSH / SFTP ターミナルクライアント。
</p>

<p align="center">
  <a href="./README.md">English</a> · <a href="./README_ZH.md">简体中文</a> · <b>日本語</b> · <a href="./README_KO.md">한국어</a>
</p>

<p align="center">
  <a href="https://github.com/leonlwq/OmniTerminal/releases"><img src="https://img.shields.io/github/v/release/leonlwq/OmniTerminal?color=0078d4&label=release" alt="Release"></a>
  <a href="https://omniterminal.leonlwq.com/ja/"><img src="https://img.shields.io/badge/website-omniterminal.leonlwq.com-2ea44f" alt="公式サイト"></a>
  <a href="https://github.com/leonlwq/OmniTerminal/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="ライセンス"></a>
  <img src="https://img.shields.io/badge/go-%3E%3D1.22-00ADD8?logo=go" alt="Go バージョン">
  <img src="https://img.shields.io/badge/wails-v2-DF1A29" alt="Wails フレームワーク">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey" alt="対応プラットフォーム">
</p>

---

## 概要

OmniTerminal は、Go 言語の高並行通信コアと最新の Web 技術スタック (Wails v2 + React 19) で構築されたネイティブデスクトップ SSH/SFTP クライアントです。旧来のレガシーな端末ツールの代替として設計され、WebGL GPU ハードウェア加速描画、セッション連動型 SFTP ファイル管理、ローカル AES-256-GCM 認証情報暗号化を提供します。

* **公式サイト**: [https://omniterminal.leonlwq.com/ja/](https://omniterminal.leonlwq.com/ja/)
* **Issue トラッカー**: [GitHub Issues](https://github.com/leonlwq/OmniTerminal/issues)

---

## 主要な技術的特徴

### 1. 現代的なワークスペース設計
- **クイック接続バー (Omnibar)**: `ssh://user@host:port` 形式の一行入力で一時セッションへ即時接続可能（設定ファイルの強制保存不要）。
- **階層型セッションツリー**: 多階層フォルダ構造、ドラッグ＆ドロップ並べ替え、カラーアイコンに対応。踏み台サーバーやポートフォワード設定を親階層からカスケード継承。
- **VS Code Dark Modern 準拠**: 5 層モジュラーアーキテクチャ (`internal/app`, `internal/core`, `internal/models`, `internal/config`, `internal/crypto`) による高保守性。

### 2. セッション連動型 SFTP ドロワー
- **統合ビューポート**: ターミナルタブの右側からシームレスに展開し、アクティブな作業ディレクトリとコンテキストを維持（独立ポップアップウィンドウ不要）。
- **並行転送エンジン**: 複数タスクの並行アップロード/ダウンロードキュー、チャンク単位のレジューム転送、リモート権限 (`chmod`) 管理をサポート。

### 3. ローカルマスターパスワード保管庫 (Zero-Plaintext)
- **PBKDF2 & AES-256-GCM 暗号化**: 保存されるすべての SSH パスワード、秘密鍵、TOTP シードをマスターキーから派生した鍵でローカル暗号化。
- **平文保存ゼロ & 自動ロック**: ディスク上への平文保存を完全排除。無操作タイムアウト時には自動的にすりガラスロック画面を作動。

### 4. GPU ハードウェア加速描画
- **xterm.js WebGL パイプライン**: 大容量ログストリームの連続出力時でも安定して 60 FPS 描画を維持。
- **ホットパスにおけるディスク書き込みゼロ (Zero Hot-path Logging)**: PTY I/O の読み書きループから無制限なデバッグログ出力を排除し、メモリ割り当てと遅延スパイクを防止。
- **10ms IPC バッチ制御**: IPC イベントを 10ms ウィンドウで集約し、文字送信ディレイ制御により高速出力時のパケットロスを防止。

### 5. マルチペイン比率同期スクロール
- **柔軟な画面分割**: 水平・垂直の画面分割に対応。
- **ビューポート比率同期スクロール**: 分割ペイン間でビューポートの相対比率に基づいてスクロールを同期し、クラスター複数マシンのログ比較検証を効率化。

### 6. コマンド自動化 & Compose パネル
- **Compose パネル**: 下部ドロワーから複数行コマンドを作成し、アクティブなすべてのペインへ一括ブロードキャスト送信。
- **Expect 形式の自動応答**: 正規表現にマッチしたプロンプトへの自動応答ログインをサポートし、定型運用を効率化。

---

## 競合製品との技術仕様比較

| 項目 | OmniTerminal | Xshell | SecureCRT | Termius |
| :--- | :--- | :--- | :--- | :--- |
| **ライセンス & 料金** | **MIT オープンソース (無料)** | 商用有償 / 制限あり | 商用買い切り ($99+) | 月額サブスク ($10+/月) |
| **対応プラットフォーム** | **macOS / Windows / Linux** | Windows のみ | 複数対応 (レガシー UI) | 複数対応 (重い Electron) |
| **SFTP 連携方式** | **内蔵サイドドロワー連携** | 別アプリ (Xftp) ポップアップ | 独立別ウィンドウ | タブ切り替え方式 |
| **認証情報の保管** | **AES-256-GCM ローカル保管庫** | 平文エクスポートリスクあり | 旧式設定ファイル | クラウド同期アカウント必須 |
| **描画エンジン** | **xterm.js WebGL GPU 加速** | GDI / DirectWrite | Win32 描画 | Electron ソフトウェア描画 |
| **UI アーキテクチャ** | **VS Code Dark Modern 規範** | Windows クラシック | クラシックメニューバー | モバイル風フラット UI |
| **分割ペイン同期スクロール** | **対応 (ビューポート比率同期)** | 未対応 | 未対応 | 未対応 |

---

## ダウンロードとインストール

各プラットフォーム向けのビルド済みバイナリは [GitHub Releases](https://github.com/leonlwq/OmniTerminal/releases) または [公式サイト](https://omniterminal.leonlwq.com/ja/) からダウンロードできます：

| OS | アーキテクチャ | パッケージ形式 | ファイル名 |
| :--- | :--- | :--- | :--- |
| **macOS** | Apple Silicon (M1/M2/M3/M4) | DMG イメージ | `OmniTerminal-macos-arm64.dmg` |
| **macOS** | Apple Silicon (ARM64) | ポータブル ZIP | `OmniTerminal-macos-arm64.zip` |
| **macOS** | Intel 64ビット (x86_64) | DMG イメージ | `OmniTerminal-macos-intel.dmg` |
| **Windows** | 64ビット (x86_64 / amd64) | ポータブル ZIP | `OmniTerminal-windows-amd64.zip` |
| **Windows** | ARM64 (Surface / Snapdragon) | ポータブル ZIP | `OmniTerminal-windows-arm64.zip` |
| **Linux** | 64ビット (glibc 2.35+) | tar.gz アーカイブ | `OmniTerminal-linux-amd64.tar.gz` |

---

## ソースコードからのビルド

OmniTerminal は [Wails v2](https://wails.io/) および Go 言語で構築されています。

### 前提条件

1. **Go**: バージョン `>= 1.22` ([golang.org](https://go.dev/dl/))
2. **Node.js**: バージョン `>= 18` および `npm` ([nodejs.org](https://nodejs.org/))
3. **Wails CLI**:
   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   ```

### 開発モードの実行

フロントエンドのホットリロードとバックエンドの通信デバッグを同時に起動します：

```bash
wails dev
```

### 本番バイナリのビルド

現在の OS 向けに最適化された本番バイナリを生成します：

```bash
wails build -clean
```

クロスコンパイルおよび配布パッケージの作成手順については、[build.sh](./build.sh) または GitHub Actions ワークフローを参照してください。

---

## キーボードショートカット一覧

| ショートカット | 対象コンテキスト | 機能説明 |
| :--- | :--- | :--- |
| `Cmd/Ctrl + C` | ターミナル | 選択範囲がある場合はコピー、ない場合は `SIGINT` 割り込みを透過 |
| `Cmd/Ctrl + Shift + F` | ターミナル | リアルタイムログ抽出パネルを呼び出し (正規表現一致) |
| `Ctrl + Enter` | Compose パネル | アクティブな全ペインへ複数行コマンドを一括ブロードキャスト送信 |
| `Cmd/Ctrl + F` | ターミナル | ターミナル内を正規表現で全文検索 & 一致箇所ハイライト |
| `F11` | ウィンドウ | ボーダーレスフルスクリーンモードに切り替え |
| `タブバー余白をダブルクリック` | ワークスペース | 新規セッションタブを作成、またはローカルシェルを起動 |

---

## セキュリティアーキテクチャ

- **統合設定ディレクトリ**: すべての設定、秘密鍵、キャッシュは `internal/config` を通じて `~/.omniterminal` に一元管理。
- **平文保存ゼロ**: セッションパスワード、秘密鍵、TOTP シードは PBKDF2 鍵派生と AES-256-GCM により暗号化。
- **並行安全性の確保**: 接続プールやセッションマッピングテーブルは `sync.RWMutex` で保護され、競合状態を防止。

---

## ライセンス

本プロジェクトは [MIT ライセンス](./LICENSE) のもとで公開されています。Issue の起票や Pull Request の提出を歓迎します。
