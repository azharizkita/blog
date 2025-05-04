import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
      <body className="flex flex-1 flex-col w-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="w-full">
            <header className="dark:bg-black z-30 sticky top-0 bg-white flex flex-row gap-4 h-[70px] shrink-0 p-3 w-full justify-center">
              <HeadBar />
            </header>
            <div className="flex w-full flex-col gap-4 p-4 overflow-y-auto">
              <div className="flex max-w-3xl flex-col gap-4 p-4 mx-auto">
                {children}
              </div>
            </div>
          </div>
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
