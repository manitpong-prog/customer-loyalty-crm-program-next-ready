import type { Metadata } from 'next';
import '../index.css';

export const metadata: Metadata = {
  title: 'Customer Loyalty CRM Program',
  description: 'ระบบสะสมแต้มลูกค้า ร้านค้า และผู้ดูแลแพลตฟอร์ม',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://static.line-scdn.net" />
        <link rel="preload" as="script" href="https://static.line-scdn.net/liff/edge/2/sdk.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
