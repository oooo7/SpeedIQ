import { ReactNode } from "react";

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { APP_CONFIG } from "@/config/app-config";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ThemeProvider } from "next-themes";

import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const geist = Geist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://speediq.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: APP_CONFIG.meta.title,
    template: "%s | SpeedIQ",
  },
  description: APP_CONFIG.meta.description,
  applicationName: "SpeedIQ",
  keywords: [
    "WhatsApp marketing",
    "WhatsApp Business API",
    "Email marketing",
    "SMS marketing",
    "DLT compliance",
    "Unified inbox",
    "Customer messaging platform",
    "WhatsApp broadcasts",
    "Resend",
    "Twilio",
  ],
  authors: [{ name: "SpeedIQ" }],
  creator: "SpeedIQ",
  publisher: "SpeedIQ",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "SpeedIQ",
    url: SITE_URL,
    title: APP_CONFIG.meta.title,
    description: APP_CONFIG.meta.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: APP_CONFIG.meta.title,
    description: APP_CONFIG.meta.description,
    creator: "@speediq",
  },
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
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className={`${plusJakarta.className} ${geist.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
