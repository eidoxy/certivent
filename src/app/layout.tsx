import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Certivent",
  description: "Event registration and participation certificates",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteHeader />
          {/* pt-24 clears the fixed navbar (top-4 + h-14) on every page. */}
          <main className="container mx-auto w-full max-w-5xl flex-1 px-4 pt-24 pb-8">{children}</main>
          {/* Toasts start below the floating navbar instead of sliding under it. */}
          <Toaster richColors position="top-right" offset={{ top: 88, right: 16, bottom: 16, left: 16 }} />
        </Providers>
      </body>
    </html>
  );
}
