import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import HeadBar from "@/components/head-bar";
import { CategoryTab } from "@/components/category-tab";
import { NavigationProvider } from "@/components/navigation-provider";
import { defaultMetadata } from "@/lib/metadata";

import "./globals.css";

export const viewport: Viewport = {
  viewportFit: "cover",
  userScalable: false,
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

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

export const metadata: Metadata = defaultMetadata;

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
          <NavigationProvider>
            <div className="w-full max-w-2xl px-6 pb-6 gap-3 flex flex-col mx-auto h-full">
              <header className="z-30 sticky top-0 flex flex-col shrink-0 w-full justify-center">
                <div className="dark:bg-black bg-white pt-6 flex flex-col gap-3 pb-1">
                  <HeadBar />
                  <CategoryTab />
                </div>
                <div className="flex w-full h-4 -mt-[0.5px] bg-gradient-to-b from-white via-white/50 to-white/0 sticky top-[116px] z-10 dark:from-black dark:via-black/50 dark:to-black/0" />
              </header>
              {children}
            </div>
          </NavigationProvider>
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
