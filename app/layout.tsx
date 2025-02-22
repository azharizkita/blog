import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CategoryTab } from "@/components/category-tab";

import "./globals.css";

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
  title: "Silenced",
  description: `Personal dumps by ${process.env.GITHUB_USERNAME}`,
  openGraph: {
    images: [{ url: "/api/og" }],
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <header className="bg-background flex h-20 shrink-0 items-center justify-center">
            <div className="flex flex-col items-center gap-0 px-3">
              <h1 className="scroll-m-20 text-3xl font-semibold tracking-tight">
                Silenced
              </h1>
              <h1 className="text-sm tracking-tight text-orange-600">
                personal dumps
              </h1>
            </div>
          </header>
          <div className="flex flex-1 w-full flex-col px-4 mt-4 max-w-2xl self-center sticky top-0 z-20">
            <CategoryTab />
            <div className="flex w-full h-2 bg-background z-10" />
            <div className="flex w-full h-4 bg-gradient-to-b from-background via-background/50 to-background/0 sticky top-[104px] z-10" />
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
