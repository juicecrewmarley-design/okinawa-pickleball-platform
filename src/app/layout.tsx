import type { Metadata } from "next";
import "./globals.css";
import { AutoLogout } from "@/components/AutoLogout";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "沖縄県ピックルボール協会 公式アプリ",
  description: "会員管理、大会エントリー、OPRランキング、協賛企業PRを一元化する公式アプリ"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AutoLogout />
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
