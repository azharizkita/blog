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
      <body className="flex flex-1 flex-col w-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="grid grid-cols-12 w-full min-h-svh">
            <header className="dark:bg-black bg-white col-span-12 lg:col-span-2 flex flex-row lg:flex-col gap-4 lg:h-svh h-[70px] shrink-0 p-3 lg:border-r-1 lg:w-[225px] w-full justify-center lg:justify-start">
              <HeadBar />
            </header>
            <div className="lg:col-span-10 col-span-12 flex w-full flex-col gap-4 p-4 h-svh overflow-y-auto">
              <div className="flex max-w-3xl flex-col gap-4 p-4 self-center">
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
