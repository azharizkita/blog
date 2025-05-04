import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";
import HeadBar from "@/components/head-bar";
import { CategoryTab } from "@/components/category-tab";

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
      <body className="flex flex-1 flex-col w-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="w-full max-w-2xl px-6 pb-6 flex flex-col gap-4 mx-auto">
            <header className="dark:bg-black z-30 sticky top-0 bg-white flex flex-col shrink-0 pt-3 w-full justify-center">
              <HeadBar />
              <CategoryTab />
            </header>

            {children}
          </div>
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
