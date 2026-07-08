# AI Company Command Center

AI社員(Claude Code / Codex / 各種スキル)が実際に働いている様子を、1画面で確認できる静的ダッシュボード。

**「今、誰が、何をしていて、どこで止まっていて、何が完成したのか」を10秒で把握する**ためのものです。架空のデモデータではなく、実在するAI社員6名の実タスク・実ログを表示します。

## 特徴

- **完全静的・無料運用**: HTML / CSS / JavaScript / JSON のみ。バックエンド・DB・ビルド工程・外部ライブラリなし。GitHub Pagesで動作
- **データ駆動**: 社員情報はHTMLに直書きせず、`data/agents.json` を読んで描画。**社員を増やす=JSONに1エントリ足すだけ**
- **本物の運用記録**: タスク(`tasks.json`)・活動ログ(`runs.json`)・成果物(`outputs.json`)が追記されていき、そのまま活動実績として残る
- **停滞の見える化**: `blocked` のタスクは理由つきで画面最上部に表示される

## 構成

```
├─ index.html        # 画面の骨組み(社員情報の直書き禁止)
├─ style.css         # レスポンシブ + ダーク/ライト対応
├─ app.js            # data/*.json を fetch して描画
├─ data/             # agents / tasks / runs / outputs / knowledge-index
├─ agents/<id>/      # 各AI社員のプロフィール
├─ outputs/          # 公開可能な成果物
├─ logs/build-log.md # 1行1イベントの活動ログ
├─ docs/spec.md      # 設計書(データ契約・画面仕様)
└─ AGENTS.md         # AIエージェント向け作業ルール
```

## 運用サイクル

1. AI社員が作業する(設計・調査・執筆・実装)
2. 作業後に `runs.json` へ追記、`tasks.json` の状態を更新、`build-log.md` に1行
3. 人間が内容を確認して commit / push(公開前の安全ゲート)
4. ダッシュボードに反映

## 公開ポリシー

ナレッジ本文・有料教材の内容・機密情報は**非公開のObsidian Vault側**にあり、このリポジトリには稼働メタデータと公開可能な成果物のみを置きます(詳細は `AGENTS.md`)。

## セットアップ

```
git clone <this repo>
cd ai-company-command-center
python -m http.server 8000   # または任意の静的サーバ
# http://localhost:8000 を開く
```

GitHub Pages: Settings → Pages → Branch: main / root を選択。

## ステータス

- 2026-07-08: Day 1 — 設計・データ基盤完成。次: MVPダッシュボード実装(T-2026-0003)
