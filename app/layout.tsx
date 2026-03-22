import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ugent - AI-Driven Study Analytics",
  description: "Modern USMLE study platform with AI-powered analytics and personalized learning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthKitProvider>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </AuthKitProvider>
      </body>
    </html>
  );
}
