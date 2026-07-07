// RootLayout 组件定义全站 HTML 结构，并加载全局样式。
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Forecasting Console',
  description: 'Prediction market account and ledger console'
};

/**
 * 定义全站 HTML 结构，并加载全局样式。
 */
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
