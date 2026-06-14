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

## 本番メール設定手順

Supabase Authの標準メール送信は検証・開発向けです。本番で30名以上が短時間に登録する場合は、独自SMTPを設定してください。独自SMTPを設定しないと、確認メールが `email rate limit exceeded` で止まることがあります。

おすすめはResendです。理由は、Supabase向けSMTP手順が分かりやすく、設定項目が少なく、確認メールのようなトランザクションメールに向いているためです。

サービス比較:

| サービス | 向いている用途 | メリット | 注意点 |
| --- | --- | --- | --- |
| Resend | 初心者、本番Authメール、小〜中規模運用 | Supabase SMTP設定が簡単。APIキーをSMTPパスワードとして使える。管理画面が分かりやすい。 | 独自ドメイン認証が必要。送信数が増える場合はプランとレート制限を事前確認する。 |
| SendGrid | 大量送信、細かい分析、将来的な拡張 | 実績が多く、SMTP/API/ログ機能が豊富。 | 初期設定や送信者認証の項目が多く、初心者には少し複雑。 |
| Gmail SMTP | 少人数テスト、既存Google Workspace利用 | 既存メールアドレスを使いやすい。 | 本番Authメールには非推奨。送信上限やアプリパスワード、組織設定の制約を受ける。 |

### Resendで独自SMTPを設定する

1. Resendにログインします。
2. `Domains` で協会の送信用ドメインを追加します。例: `okinawa-pickleball.jp` または `auth.okinawa-pickleball.jp`
3. Resendに表示されるDNSレコードを、ドメイン管理会社のDNS設定へ追加します。
4. Resend側でドメインが `Verified` になるまで待ちます。
5. ResendでAPI Keyを作成します。
6. Supabase Dashboardを開き、対象プロジェクトを選びます。
7. 左メニューの `Authentication` を開きます。
8. `Email` または `Emails` の設定画面を開きます。
9. `SMTP Settings` を開き、独自SMTPを有効にします。
10. 以下を入力します。

```text
Sender email: no-reply@okinawa-pickleball.jp
Sender name: 沖縄県ピックルボール協会
SMTP host: smtp.resend.com
SMTP port: 465
SMTP username: resend
SMTP password: ResendのAPI Key
```

11. 保存します。
12. Supabaseの `Authentication` → `Rate Limits` を開き、メール送信上限を本番登録数に合わせて調整します。30名以上が一気に登録する日は、最低でも想定人数より余裕を持った値にしてください。

### SendGridで設定する場合

1. SendGridでSender IdentityまたはDomain Authenticationを設定します。
2. API Keyを作成します。
3. Supabaseの `Authentication` → `Email` → `SMTP Settings` に以下を入力します。

```text
Sender email: no-reply@okinawa-pickleball.jp
Sender name: 沖縄県ピックルボール協会
SMTP host: smtp.sendgrid.net
SMTP port: 587
SMTP username: apikey
SMTP password: SendGridのAPI Key
```

### Gmail SMTPで設定する場合

Google Workspaceを使っている場合のみ検討してください。個人Gmailを本番Authメールに使う運用は避けてください。

```text
SMTP host: smtp.gmail.com
SMTP port: 465 または 587
SMTP username: 送信用Google Workspaceメールアドレス
SMTP password: アプリパスワード
```

Google Workspaceでは、用途によって `smtp-relay.gmail.com` を使う方法もあります。大量登録や将来的な運用を考えると、ResendまたはSendGridの方が管理しやすいです。

### Supabase確認メールテンプレート日本語化

Supabase Dashboardで `Authentication` → `Email Templates` を開き、`Confirm signup` を編集します。

Subject:

```text
【沖縄県ピックルボール協会】メールアドレス確認
```

Body:

```html
<h2>メールアドレスの確認</h2>
<p>沖縄県ピックルボール協会 公式アプリへのご登録ありがとうございます。</p>
<p>以下のボタンを押して、メールアドレスを確認してください。</p>
<p>
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 18px;background:#0f3a45;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">
    メールアドレスを確認する
  </a>
</p>
<p>ボタンが開けない場合は、以下のURLをブラウザにコピーしてください。</p>
<p>{{ .ConfirmationURL }}</p>
<p>このメールに心当たりがない場合は、破棄してください。</p>
<p>沖縄県ピックルボール協会</p>
```

送信者名は、SMTP Settingsの `Sender name` に `沖縄県ピックルボール協会` と入力します。Management APIを使う場合は `smtp_sender_name` に同じ値を設定します。

### 本番公開前のメール認証テスト

1. SupabaseのSMTP Settingsを保存します。
2. SupabaseのRate Limitsで、短時間に30名以上が登録しても止まらない値にします。
3. ResendまたはSendGridの送信ログ画面を開いておきます。
4. テスト用メールアドレスを3件以上用意します。
5. Vercel本番URLから新規登録を実行します。
6. それぞれのメールに確認メールが届くか確認します。
7. メール本文のボタンを押して、アプリへ戻れるか確認します。
8. Supabase AuthのUsersで、メール確認済みになるか確認します。
9. 迷惑メールに入らないか確認します。
10. 10件程度を連続登録して、`email rate limit exceeded` が出ないことを確認します。
11. 大会前など登録が集中する日は、事前にResendまたはSendGrid側の送信上限も確認します。

## GitHub Private運用と公開前チェック

このリポジトリは、会員情報・大会運営情報・Supabase管理用設定を扱うため、GitHubではPrivateリポジトリとして運用してください。Publicにする場合でも、実データや秘密キーを含めないことを必ず確認します。

公開・共有前に確認すること:

1. GitHubのリポジトリ設定で `Settings` → `General` → `Danger Zone` → `Change repository visibility` から `Private` にします。
2. `.env.local`、`.env`、`.env.*` はコミットしません。SupabaseのキーはVercel Environment Variablesまたはローカル `.env.local` のみに保存します。
3. `SUPABASE_SERVICE_ROLE_KEY`、`sb_secret_`、JWT形式の秘密キーは、コード・README・SQL・履歴に入れません。
4. `supabase/legacy-members-import.sql`、CSV、Excelなど、会員個人情報を含むファイルはコミットしません。
5. ZIP成果物は古いコードや設定が残りやすいため、基本的にGitHubへコミットしません。
6. コミット前に以下を確認します。

```powershell
git status --short
git ls-files | Select-String -Pattern "legacy-members-import|\.csv$|\.xlsx$|\.xls$|\.env$|\.env\.local$"
git grep -n "sb_secret_"
git grep -n "SUPABASE_SERVICE_ROLE_KEY="
```

秘密キーや個人情報を過去にcommitしていた場合:

1. そのキーは漏えい済みとして扱い、Supabaseで即時ローテーションします。
2. GitHubをPrivateに変更しても、履歴に残った秘密情報は消えません。
3. 履歴から削除する場合は `git filter-repo` またはBFG Repo-Cleanerで対象ファイル・文字列を削除します。
4. 履歴を書き換えた後は `git push --force-with-lease` が必要です。共同作業者がいる場合は全員に再cloneを依頼します。
5. GitHubに表示されたキャッシュやforkがある場合は、GitHub Supportへの削除依頼も検討します。

現在の運用方針:

- `.env.local.example` にはプレースホルダーだけを置きます。
- 本番値はVercel Environment Variablesにだけ設定します。
- 会員データの取り込みSQLはローカルで生成し、Supabase SQL Editorで実行後、Gitには入れません。
