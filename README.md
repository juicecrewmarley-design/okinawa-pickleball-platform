# 沖縄県ピックルボール協会 公式アプリ

会員制度、大会エントリー、OPRポイント、ランキング、お知らせ、協賛企業PRを一元管理するMVPです。

## MVPで実装済みの画面

- 会員登録: 会員IDを自動発行し、Supabase設定済みならAuth登録とプロフィール保存を行います。
- 会員登録の居住地: 所属エリア入力は使わず、沖縄県内/沖縄県外を選択します。沖縄県内の場合は市町村を選択します。
- ログイン: 最初の入口画面です。ログインしないと主要画面は表示されず、20分以上操作がない場合は自動ログアウトします。
- 会員種別: 新規登録では一般会員（年会費無料）とプレミアム会員（年会費2,000円/PayPay決済案内）を選択できます。既存番号OKP-0001〜0209はプレミアム会員として扱います。
- 会員マイページ: QRコード付き会員証、参加履歴、OPR、ランキングを表示します。
- 大会一覧・大会詳細: ログイン中の会員IDを表示し、カテゴリ選択とペア/チームの紐づけでエントリーできます。
- 大会カテゴリ: 管理者が男子ダブルス、女子ダブルス、ミックスダブルス、チーム戦と各カテゴリを選択できます。
- 種目別設定: 管理者が各種目ごとの定員、一般会員参加料、プレミアム会員参加料を設定できます。
- エントリー確定: ダブルスは片方だけの申込では待機、ペア双方が同じ大会・カテゴリで相互に会員IDを入力すると完了扱いになります。
- 管理者画面: 会員一覧、大会作成フォーム、参加者一覧、試合結果入力、お知らせ投稿、協賛企業登録の初期UIです。
- OPRランキング: 男子ダブルス、女子ダブルス、ミックスダブルスをカテゴリ別に表示し、総合は男子・女子に分けて表示します。
- お知らせ・協賛企業: イベント案内とスポンサー掲載ページです。
- Googleフォーム既存会員ID引き継ぎ: 登録画面で番号引き継ぎを選び、L列の4桁番号と生年月日または電話番号下4桁で本人確認してから既存番号を引き継ぎます。

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
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
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
- 会員種別・エントリー更新SQL: `supabase/membership-entry-update.sql`

## Googleフォーム既存会員の安全な引き継ぎ

`legacy_members` は過去のGoogleフォーム会員データ、`profiles` はアプリに正式登録した会員データです。既存会員は登録画面で「番号引き継ぐ方」を選び、L列のOKP番号4桁に加えて、生年月日または電話番号下4桁で本人確認します。照合に成功するまで、氏名・メールアドレス・電話番号などの個人情報は画面に表示しません。

引き継ぎ登録が完了すると、`profiles.member_id` に既存の会員IDを保存し、`legacy_members.claimed_by` と `legacy_members.claimed_at` に登録済み情報を記録します。すでに `claimed_by` が入っている会員番号は再利用できません。ブラウザ側から `legacy_members` を直接読むことはなく、必ずサーバーAPI経由で照合します。

安全に取り込む手順:

1. Supabase SQL Editorで `supabase/schema.sql` を実行します。
2. Googleスプレッドシートの `フォームの回答 1` タブをCSVでダウンロードします。
3. CSVをローカルPCだけに置き、以下で投入用SQLを作成します。

```powershell
npm run import:legacy-members -- .\google-form-members.csv
```

4. 生成される `supabase/legacy-members-import.sql` は個人情報を含むため、GitHubへコミットしないでください。`.gitignore` で除外済みです。
5. 生成SQLは50件ずつの `insert into public.legacy_members (...) values ... on conflict (member_id) do update ...;` ブロックに分かれます。Supabase SQL Editorへ1ブロックずつ貼り付けて実行できます。
6. 最後に以下で件数を確認します。

```sql
select count(*) from public.legacy_members;
```

今回添付された `沖縄ピックルボールメンバー会員登録（回答） (2).xlsx` は209名分（`OKP-0001` から `OKP-0209`）です。Googleフォームでは同じメールアドレスを複数会員が使っている場合があるため、`legacy_members` は `member_id` を主キーにし、メールアドレスの重複を許可します。

既存会員照合にはサーバー側の `SUPABASE_SERVICE_ROLE_KEY` が必要です。VercelのEnvironment Variablesに、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` を設定してください。詳しくは `docs/google-form-import.md` も確認してください。

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
