# 沖縄県ピックルボール協会 公式アプリ

会員制度、大会エントリー、OPRポイント、ランキング、お知らせ、協賛企業PRを一元管理するMVPです。

## MVPで実装済みの画面

- 会員登録: 会員IDを自動発行し、Supabase設定済みならAuth登録とプロフィール保存を行います。
- 会員登録の居住地: 所属エリア入力は使わず、沖縄県内/沖縄県外を選択します。沖縄県内の場合は市町村を選択します。
- ログイン: 一般会員と管理者ログインの導線を分けています。
- 会員マイページ: QRコード付き会員証、参加履歴、OPR、ランキングを表示します。
- 大会一覧・大会詳細: 会員/非会員を選び、カテゴリ選択とメンバー紐づけでエントリーできます。
- 大会カテゴリ: 管理者が男子ダブルス、女子ダブルス、ミックスダブルス、チーム戦と各カテゴリを選択できます。
- 種目別設定: 管理者が各種目ごとの定員、会員参加費、非会員参加費を設定できます。
- エントリー確定: ダブルスはペア1名、チーム戦は4名の紐づけが完了すると確定扱いになります。非会員申込は受付後、管理者確認できます。
- 管理者画面: 会員一覧、大会作成フォーム、参加者一覧、試合結果入力、お知らせ投稿、協賛企業登録の初期UIです。
- OPRランキング: 男子ダブルス、女子ダブルス、ミックスダブルスをカテゴリ別に表示し、総合は男子・女子に分けて表示します。
- お知らせ・協賛企業: イベント案内とスポンサー掲載ページです。
- Googleフォーム既存会員ID引き継ぎ: 登録画面では番号だけを入力し、Supabase登録時に既存番号を照合して引き継ぎます。

Supabase未設定でもサンプルデータで画面確認できます。環境変数を設定すると、登録・ログイン・大会エントリーがSupabase向けに動きます。

## ローカルで動かす方法

1. Node.jsをインストールします。
2. このフォルダで依存関係を入れます。

```bash
npm install
```

3. Supabaseを使う場合は、`.env.local.example`をコピーして`.env.local`を作り、値を入れます。

```bash
cp .env.local.example .env.local
```

4. Supabase SQLエディタで`supabase/schema.sql`を実行します。
5. 開発サーバーを起動します。

```bash
npm run dev
```

6. ブラウザで`http://localhost:3000`を開きます。

## Windowsで起動する手順

1. Node.js LTSをインストールします。
   - 公式サイト: https://nodejs.org/
   - インストール後、PowerShellまたはコマンドプロンプトを開き直してください。

2. ZIPを展開します。
   - 例: `C:\Users\naoto\OneDrive\Documents\アプリ作成\okinawa-pickleball-official-app`

3. PowerShellでアプリのフォルダへ移動します。

```powershell
cd "C:\Users\naoto\OneDrive\Documents\アプリ作成\okinawa-pickleball-official-app"
```

4. 初回だけ依存関係をインストールします。

```powershell
npm install
```

5. Supabaseを使う場合は、`.env.local.example`をコピーして`.env.local`を作成します。

```powershell
Copy-Item .env.local.example .env.local
```

`.env.local`に以下を設定してください。

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Supabaseをまだ設定しない場合でも、サンプルデータで画面プレビューできます。

6. 開発サーバーを起動します。

```powershell
npm run dev
```

7. ブラウザで以下のURLを開きます。

```text
http://localhost:3000
```

起動に成功すると、PowerShellに`Ready`と表示されます。終了するときは、PowerShellで`Ctrl + C`を押してください。

## ZIP配布について

配布用ZIPには、ソースコード、設定ファイル、README、Supabaseスキーマ、画像素材を含めます。`node_modules`、`.next`、キャッシュ、検証用スクリーンショットは含めません。ZIPを展開した後、上記のWindows手順で起動してください。

## 設計資料

- 基本設計: `docs/basic-design.md`
- Googleフォーム既存会員の取り込み: `docs/google-form-import.md`
- Supabaseスキーマ: `supabase/schema.sql`

## Googleフォーム既存会員の登録済み化

既にGoogleフォームで登録済みの方は、フォームで発行された番号をアプリ登録時に引き継げます。登録画面では `0001` のように番号だけ入力できます。

1. Googleスプレッドシートの `フォームの回答 1` タブをCSVでダウンロードします。
2. 以下を実行して、Supabase投入用SQLを作成します。

```powershell
npm run import:legacy-members -- .\google-form-members.csv
```

3. Supabase SQL Editorで `supabase/schema.sql` を実行します。
4. 続けて生成された `supabase/legacy-members-import.sql` を実行します。
5. 既存会員は、会員登録画面でGoogleフォーム登録時のメールアドレスと会員番号だけを入力します。

詳しくは `docs/google-form-import.md` を確認してください。

## 管理者権限

管理者は `juicecrewmarley@yahoo.co.jp` の1名のみです。Supabase Authでこのメールアドレスのユーザーを作成した後、Supabase SQL Editorで以下のSQLファイルを実行してください。

```text
supabase/grant-admin.sql
```

このSQLは、`auth.users` から `juicecrewmarley@yahoo.co.jp` を探し、`public.profiles` に行がなければ作成し、`role='admin'` に更新します。最後に `email` と `role` を確認するSELECTも実行します。

大会作成がRLSで拒否される場合は、続けて以下もSQL Editorで実行してください。

```text
supabase/admin-tournament-saving.sql
```
