import type { Metadata } from "next";
import { Chakra_Petch } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./layout.module.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

const font = Chakra_Petch({
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Silenced",
  description: `Dumps by ${process.env.GITHUB_USERNAME}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={font.className}>
        <div className={styles.page}>
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
        <SpeedInsights sampleRate={0.5} />
      </body>
    </html>
  );
}
