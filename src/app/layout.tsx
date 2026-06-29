import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hatico Manager - Quản lý Báo cáo Công việc",
  description: "Hệ thống quản lý công việc và báo cáo hàng ngày đa phân cấp - Công ty Cổ phần XNK Quốc tế Hatico",
  icons: {
    icon: [
      { url: "/logo/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/logo/favicon-192.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="preconnect"
          href="https://bmmmdhinlqrlxfrtozpt.supabase.co"
        />
        <link
          rel="dns-prefetch"
          href="https://bmmmdhinlqrlxfrtozpt.supabase.co"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
