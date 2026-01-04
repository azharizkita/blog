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
            <header className="z-30 sticky top-0 left-0 right-0 flex flex-col w-full">
              <div className="dark:bg-black bg-white w-full">
                <div className="w-full max-w-2xl mx-auto px-6 pt-6 flex flex-col gap-3 pb-1">
                  <HeadBar />
                </div>
              </div>
              <div className="w-full h-8 bg-gradient-to-b from-white via-white/60 via-40% to-white/0 dark:from-black dark:via-black/60 dark:via-40% dark:to-black/0" />
            </header>
            <div className="w-full max-w-2xl px-6 pb-6 gap-3 flex flex-col mx-auto h-full">
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
