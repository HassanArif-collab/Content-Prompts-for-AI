import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Documentary Studio — Research · Script · Storyboard · Production",
  description: "A single workspace for long-form documentary creators. Manage research vault, scene-by-scene scripts with runtime estimation, source library, and production board.",
  keywords: ["documentary", "filmmaking", "screenwriting", "storyboard", "research", "production"],
  authors: [{ name: "Documentary Studio" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Documentary Studio",
    description: "A single workspace for long-form documentary creators.",
    siteName: "Documentary Studio",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Documentary Studio",
    description: "A single workspace for long-form documentary creators.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
        {children}
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
