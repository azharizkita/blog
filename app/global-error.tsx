"use client";

import { Inter, Roboto_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

export default function Error() {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${roboto_mono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="flex flex-1 flex-col w-full min-h-[100svh]">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex flex-1 w-full flex-col gap-4 p-4 max-w-2xl self-center">
            <div className="flex h-full flex-col flex-grow justify-center gap-4">
              <Card>
                <CardHeader>
                  <h2 className="scroll-m-2 text-2xl font-semibold tracking-tight first:mt-0 w-full">
                    Uh, something went wrong...
                  </h2>
                </CardHeader>
                <CardContent className="px-6 py-0">
                  <p className="leading-7 [&:not(:first-child)]:mt-2">
                    Don&apos;t worry, I have been notified regarding this error and
                    will take action as soon as I am free. Cheers!
                  </p>
                </CardContent>
                <CardFooter className="flex w-full grow flex-col gap-4">
                  <p className="leading-7 text-muted-foreground">
                    Meanwhile, let&apos;s get you outta here
                  </p>
                  <div className="flex flex-col gap-2 grow w-full">
                    <Button asChild className="flex grow">
                      <Link href="/" replace>
                        Home
                      </Link>
                    </Button>
                    <div className="flex grow gap-2">
                      <Button asChild className="flex grow">
                        <Link href="articles" replace>
                          Articles
                        </Link>
                      </Button>
                      <Button asChild className="flex grow">
                        <Link href="beeps" replace>
                          Beeps
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
