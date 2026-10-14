import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import CookieBanner from "@/components/CookieBanner";
import LayoutWrapper from "@/components/LayoutWrapper";
import StudioGuard from "@/components/StudioGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BEATLAB",
  description: "Minimalist CRM & Studio OS for Producers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-black flex h-screen overflow-hidden`}
      >
        <Sidebar />
        <LayoutWrapper>
          <StudioGuard>{children}</StudioGuard>
        </LayoutWrapper>
        <CookieBanner />
      </body>
    </html>
  );
}
