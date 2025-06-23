import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AptosProvider } from "./providers/AptosProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aptos Admin Panel",
  description: "Admin panel for Aptos blockchain operations with Petra wallet support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark:bg-gray-800 bg-gray-800">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AptosProvider>
          {children}
        </AptosProvider>
      </body>
    </html>
  );
}
