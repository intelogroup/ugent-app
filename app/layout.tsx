import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalProviders } from "@/components/ConditionalProviders";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ugent — A Clear Route Through USMLE Step 1",
  description: "A focused 19-week USMLE Step 1 curriculum with clear study blocks, practice progress, and Clea, your AI study companion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConditionalProviders>
          {children}
        </ConditionalProviders>
      </body>
    </html>
  );
}
