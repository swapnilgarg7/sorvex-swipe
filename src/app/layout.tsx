import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { AmbientOrbs } from "@/components/ambient-orbs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sorvex — Judge AI. Get paid.",
  description:
    "Swipe to pick the better AI response. Two seconds a task. Every judgment trains frontier models — and pays you.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  // The deck is a fixed surface; pinch-zooming it just breaks the gesture.
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-[#0A0A0A] text-white">
        <AmbientOrbs />
        {/* Phone-width shell, centered on desktop. Orbs bleed outside it. */}
        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
