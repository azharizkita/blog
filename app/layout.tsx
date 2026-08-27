import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavigationBar } from "@/components/navigation-bar";
import { Footer } from "@/components/footer";
import { config } from "@/lib/config";
import { rssAlternate } from "@/lib/metadata";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const roboto_mono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
});

const baseClass = cn(
  "h-full",
  "antialiased",
  inter.variable,
  roboto_mono.variable,
  "font-sans",
);

export const metadata: Metadata = {
  metadataBase: new URL(config.site.url),
  title: {
    default: config.site.name,
    template: `%s | ${config.site.name}`,
  },
  description: config.site.description,
  applicationName: config.site.name,
  authors: [{ name: config.author.name, url: config.author.url }],
  creator: config.author.name,
  publisher: config.author.name,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: config.site.name,
    title: config.site.name,
    description: config.site.description,
    url: config.site.url,
    locale: "en_US",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: config.site.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: config.site.name,
    description: config.site.description,
    images: ["/api/og"],
  },
  // Icons come from the app/favicon.ico and app/icon.svg file conventions.
  alternates: {
    types: rssAlternate,
  },
};

export const viewport: Viewport = {
  // Matches --background (oklch 1 0 0 / oklch 0.145 0 0) for browser chrome.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={baseClass}>
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:border focus:bg-background focus:px-3 focus:py-2 focus:text-sm"
            >
              Skip to content
            </a>
            {/* App shell owns the flex column so base-ui popups (portaled to
                <body>) don't become flex items and shift the layout. */}
            <div className="flex min-h-dvh flex-col gap-4">
              <header className="w-full max-w-3xl mx-auto flex-none pt-4">
                <NavigationBar />
              </header>

              <main
                id="main-content"
                className="isolate flex w-full flex-1 flex-col gap-8 px-4 max-w-3xl mx-auto"
              >
                {children}
              </main>

              <div className="w-full max-w-3xl mx-auto px-4 pb-8">
                <Footer />
              </div>
            </div>
          </TooltipProvider>
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
