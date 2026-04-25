# awesome docs ai works

本リポジトリは、非エンジニア（ただしIT/インターネット企業に勤めていて一定のリテラシーがあるほう）向けに、ClaudeやGeminiといったLLM / 生成AIツール群について説明し、業務効率化につなげるためのドキュメントを置く場所です。

## 執筆者向け

章を書く／直す前に、[執筆ガイドライン](WRITING_GUIDE.md)に目を通してください。想定読者像・表記ルール・Lint運用・Mermaid図のスタイルなどをまとめています。

## 目次

章は大きく4つのかたまりに分かれています。用途別の最短ルートは [0章](docs/00-overview.md#本ドキュメントの歩き方) を参照してください。

### I. 導入と体験

- [0. オーバービュー: 本ドキュメントの地図](docs/00-overview.md)
- [1. Google Workspaceで使えるGeminiを使ってみる (入門)](docs/01-gemini-in-workspace.md)

### II. 土台の理解

- [2. 生成AIとは何か](docs/02-what-is-generative-ai.md)
- [3. 外部システムとの接続: ツール呼び出しの仕組み](docs/03-external-system-integration.md)
- [4. 「学習」というキーワードの誤解](docs/04-misunderstanding-learning.md)
- [5. ハルシネーション: 「AIが知っていること」のリテラシー](docs/05-hallucination-and-knowledge-literacy.md)
- [6. 用語集: モデル・プロンプト・コンテキストほか](docs/06-terminology.md)

### III. 共通能力とセキュリティ

- [7. 生成AIでできること (共通編): チャット・アーティファクト・コネクタの3本柱](docs/07-common-capabilities.md)
- [8. セキュリティ (個人利用編): 入出力・履歴の扱いと組織ルールの読み解き方](docs/08-security-individual.md)
- [9. セキュリティ (エージェント時代のガバナンス): サンドボックス、MCP/コネクタ、確認をどこに絞るか](docs/09-security-agent-era.md)

### IV. サービス別の使いこなし

- [10. あらためてGeminiを使いこなそう](docs/10-gemini-advanced.md)
- [11. Google WorkspaceとGemini](docs/11-google-workspace-and-gemini.md)
- [12. Claudeを使いこなそう](docs/12-claude.md)

### 付録

- [Appendix: ワークフローツール](docs/appendix-workflow-tools.md)
- [Appendix: デスクトップの自動化](docs/appendix-desktop-automation.md)
- [Appendix: Claude Code](docs/appendix-claude-code.md)
