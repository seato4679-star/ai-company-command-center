# AGENTS.md — AIエージェント向け作業ルール

このリポジトリは「AI Company Command Center」(AI社員の稼働可視化ダッシュボード)。AIがここで作業するときは以下に従う。

## 目的

実在するAI社員のタスク・ログ・成果物を構造化データとして蓄積し、静的ダッシュボードで可視化する。見せかけのデモを作らない。

## データ契約(スキーマ変更は人間の承認必須)

- `data/agents.json` … 社員名簿。`id / name / department / role / status / current_task_id / last_run / output_dir / profile`
- `data/tasks.json` … タスク。`id(T-YYYY-NNNN) / title / agent_id / department / status / input / output / created / updated / blocked_reason / next_action / human_check`
- `data/runs.json` … 活動記録。**追記専用・削除禁止・新しい順**。`ts / agent_id / task_id / action / result(ok|fail) / output_link / note`
- `data/outputs.json` … 成果物カタログ。`date / title / agent_id / type / link / public`
- `data/knowledge-index.json` … ナレッジの件数とメタ情報のみ(本文を置かない)
- status値: `idle | running | waiting | blocked | completed | archived`。`blocked` には `blocked_reason` 必須
- 日時はISO8601(+09:00)。日付は `YYYY-MM-DD`

## 作業サイクル(全エージェント共通)

1. 作業前: `tasks.json` の自分のタスクと `next_action` を確認
2. 作業する
3. 作業後: ① `runs.json` に追記 ② `tasks.json` を更新(status / next_action / human_check) ③ `logs/build-log.md` に1行追記 ④ 成果物があれば `outputs.json` に登録
4. 完了報告: 何を作った / どこに保存した / 何を確認した / 人間が見るべき点

## コーディング規約(ダッシュボード実装)

- 素のHTML / CSS / JavaScriptのみ。フレームワーク・ビルド工程・外部CDN禁止
- 社員情報・タスク情報をHTMLに直書きしない(必ず `data/*.json` をfetch)
- fetchは相対パス(GitHub Pagesのサブパスで動くこと)
- JSONが欠損・不正でもエラーで真っ白にしない(該当セクションを空表示)
- 375px〜1280pxで横スクロールなし。`prefers-color-scheme` でダーク/ライト対応

## 公開安全ルール(最重要)

これは**公開リポジトリ**。以下を絶対に含めない:

- 有料教材(Brain等)の本文・詳細な要約
- 顧客名・金額・契約情報・個人情報
- 社内ナレッジの本文(件数・タイトル等のメタ情報のみ可)
- APIキー・認証情報
- `outputs.json` で `public: false` のものは実体を置かずリンクもnullにする

## 社員追加手順

1. `data/agents.json` に1エントリ追加(id重複禁止)
2. `agents/<id>/profile.md` を作成(役割/やること/やらないこと/出力先/品質基準)
3. コード変更は不要(画面に自動反映されることを確認)

## 禁止事項

- ファイル削除・runs.jsonの改変(追記のみ)・スキーマの破壊的変更
- 人間の確認なしのpush・公開設定変更
- 架空のログ・成果物の捏造(実際にやった作業だけを記録する)

## 完了条件

- データ契約に準拠している
- ローカル(`python -m http.server`)とGitHub Pagesの両方で表示できる
- `agents.json` への追加だけで社員カードが増える
