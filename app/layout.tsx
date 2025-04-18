import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CategoryTab } from "@/components/category-tab";

import "./globals.css";
import HeadBar from "@/components/head-bar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const roboto_mono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://silenced.life"),
  title: "Silenced | Welcome",
  description: `Personal dumps by ${process.env.GITHUB_USERNAME}`,
  openGraph: {
    url: "https://silenced.life",
    siteName: "Silenced | Welcome",
    images: [{ url: "/api/og?title=Welcome" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${roboto_mono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="flex flex-1 flex-col w-full min-h-[100svh]">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <header className="dark:bg-black bg-white flex h-20 shrink-0 items-center justify-center">
            <HeadBar />
          </header>
          <div className="flex w-full flex-col px-4 mt-4 max-w-2xl self-center sticky top-0 z-20">
            <CategoryTab />
            <div className="flex w-full h-2 dark:bg-black bg-white z-10" />
            <div className="flex w-full h-4 bg-gradient-to-b from-white via-white/50 to-white/0 sticky top-[104px] z-10 dark:from-black dark:via-black/50 dark:to-black/0" />
          </div>
          <div className="flex flex-1 w-full flex-col gap-4 p-4 max-w-2xl self-center">
            {children}
          </div>
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
