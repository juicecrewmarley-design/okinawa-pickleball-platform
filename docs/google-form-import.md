# Googleフォーム既存会員の取り込み

既にGoogleフォームで会員登録している方は、フォームで発行済みの会員番号をそのまま引き継げます。登録画面では `0001` のようなL列の4桁番号に加えて、生年月日または電話番号下4桁で本人確認します。

## 対象シート

- スプレッドシート: `沖縄ピックルボールメンバー会員登録（回答）`
- タブ: `フォームの回答 1`
- 今回取り込みSQLを生成したExcel: `沖縄ピックルボールメンバー会員登録（回答） (2).xlsx`
- 取り込み対象: 209名
- 確認済みの会員ID列: `L列`
- 確認済みの会員ID範囲: `OKP-0001` から `OKP-0209`

## アプリ側の仕組み

1. Googleフォーム回答者を `legacy_members` テーブルへ取り込みます。
2. 既存会員が会員登録画面で「番号引き継ぐ方」を選び、L列のOKP番号4桁と本人確認情報を入力します。
3. サーバーAPIが `legacy_members` を照合します。番号だけでは個人情報を返しません。
4. 本人確認に成功した場合だけ、氏名、フリガナ、性別、生年月日、電話番号、メールアドレス、市町村をフォームへ反映します。
5. Supabase Authでユーザーが作成される時、DBトリガーが `legacy_members` を再照合します。
6. 照合に成功した場合、`profiles.member_id` に既存の番号を引き継ぎ、`legacy_members.claimed_by` と `legacy_members.claimed_at` を記録します。
7. すでに `claimed_by` が入っている会員番号、または本人確認に失敗した会員番号は登録できません。

## 取り込み手順

1. Googleスプレッドシートを開きます。
2. `フォームの回答 1` タブを開きます。
3. メニューから `ファイル` → `ダウンロード` → `カンマ区切り値（.csv）` を選びます。
4. ダウンロードしたCSVをアプリフォルダに置きます。例: `google-form-members.csv`
5. PowerShellで以下を実行します。

```powershell
npm run import:legacy-members -- .\google-form-members.csv
```

6. `supabase/legacy-members-import.sql` が作成されます。このSQLは個人情報を含むためGitHubにコミットしないでください。`.gitignore` で除外済みです。
7. Supabase SQL Editorで、先に `supabase/schema.sql` を実行します。
8. 続けて `supabase/legacy-members-import.sql` を実行します。生成SQLは50件ずつのブロックに分かれているため、SQL Editorへ1ブロックずつ貼り付けて実行できます。
9. 最後に以下で件数を確認します。

```sql
select count(*) from public.legacy_members;
```

これで既存Googleフォーム会員は、会員番号と本人確認情報が一致した時だけ、既存番号を引き継げます。

今回添付されたExcelから生成済みのSQLは、以下です。

```text
supabase/legacy-members-import.sql
```

Googleフォームでは家族・共有メールなどでメールアドレスが重複する場合があるため、`legacy_members.email` は重複を許可し、`member_id` を主キーとして管理します。

## CSV列の対応

| Googleフォーム列 | Supabase列 |
| --- | --- |
| 会員ID | `legacy_members.member_id` |
| メールアドレス | `legacy_members.email` |
| 氏名（漢字）※フルネーム | `legacy_members.full_name` |
| 氏名（フリガナ）※フルネーム | `legacy_members.furigana` |
| 性別 | `legacy_members.gender` |
| 生年月日 | `legacy_members.birth_date` |
| 電話番号 | `legacy_members.phone` |
| 現在お住まいの地域 | `legacy_members.residence_scope` |
| 現在お住まいの地域 | `legacy_members.prefecture` |
| 市町村名 | `legacy_members.municipality` |
| ピックルボール経験 | `legacy_members.pickleball_experience` |
| タイムスタンプ | `legacy_members.form_timestamp` |

## 注意

- 会員番号だけでは個人情報を表示しません。生年月日または電話番号下4桁で本人確認します。
- `legacy_members` はブラウザ側から直接読ませず、サーバーAPIとDBトリガーで照合します。
- 既存会員照合には `SUPABASE_SERVICE_ROLE_KEY` が必要です。VercelのEnvironment Variablesに設定してください。
- 既存会員IDは個人情報と紐づくため、CSVや生成SQLの共有範囲に注意してください。
