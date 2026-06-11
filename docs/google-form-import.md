# Googleフォーム既存会員の取り込み

既にGoogleフォームで会員登録している方は、フォームで発行済みの会員番号をそのまま引き継げます。登録画面では `0001` のように番号だけ入力できます。

## 対象シート

- スプレッドシート: `沖縄ピックルボールメンバー会員登録（回答）`
- タブ: `フォームの回答 1`
- 行数: 305行
- 確認済みの会員ID列: `L列`
- 確認済みの会員ID範囲: `OKP-0001` から `OKP-0204`

## アプリ側の仕組み

1. Googleフォーム回答者を `legacy_members` テーブルへ取り込みます。
2. 既存会員がアプリの会員登録画面で、Googleフォーム登録時のメールアドレスと会員番号だけを入力します。
3. Supabase Authでユーザーが作成される時、DBトリガーが `legacy_members` を照合します。
4. メールアドレスと会員番号が一致した場合、`profiles.member_id` に既存の番号を引き継ぎます。
5. 一致しない場合は、別人による番号取得を防ぐため登録を止めます。

## 取り込み手順

1. Googleスプレッドシートを開きます。
2. `フォームの回答 1` タブを開きます。
3. メニューから `ファイル` → `ダウンロード` → `カンマ区切り値（.csv）` を選びます。
4. ダウンロードしたCSVをアプリフォルダに置きます。例: `google-form-members.csv`
5. PowerShellで以下を実行します。

```powershell
npm run import:legacy-members -- .\google-form-members.csv
```

6. `supabase/legacy-members-import.sql` が作成されます。
7. Supabase SQL Editorで、先に `supabase/schema.sql` を実行します。
8. 続けて `supabase/legacy-members-import.sql` を実行します。

これで既存Googleフォーム会員は、同じメールアドレスと会員番号でアプリ登録した時に、既存番号を引き継げます。

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

- Googleフォームのメールアドレスとアプリ登録時のメールアドレスが一致している必要があります。
- メールアドレスが変わっている既存会員は、管理者が `legacy_members.email` を更新してから登録してください。
- 既存会員IDは個人情報と紐づくため、CSVや生成SQLの共有範囲に注意してください。
