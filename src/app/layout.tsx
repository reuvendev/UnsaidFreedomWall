import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Footer } from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "TambayanEselyu — Freedom Wall & Anonymous Chat",
  description: "A safe, uninhibited anonymous space to share your thoughts, and rants.",

  keywords: [
      "TambayanEselyu",
      "Tambayan SLU",
      "TambayanSLU",
      "SLU Freedom Wall",
      "Saint Louis University Freedom Wall",
      "SLU Anonymous Chat",
      "Louisian Freedom Wall",
      "Louisian Anonymous Chat",
      "SLU Baguio",
      "Saint Louis University Baguio",
      "Louisians",
    ],

  authors: [
    {
      name: "TambayanEselyu",
    },
  ],

  creator: "TambayanEselyu",
  publisher: "TambayanEselyu",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  icons: {
    icon: "https://cdn.tambayanslu.com/icon/TAMBAYAN_IC.png", 
  },

  openGraph: {
    title: "TambayanEselyu — Freedom Wall & Anonymous Chat",
    description:
      "An independent anonymous community for Louisians to share thoughts, stories, questions, and conversations.",
    url: "https://tambayanslu.com",
    siteName: "TambayanEselyu",
    type: "website",
    locale: "en_PH",
    images: [
      {
        url: "https://cdn.tambayanslu.com/icon/TAMBAYAN_IC.png",
        width: 512,
        height: 512,
        alt: "TambayanEselyu",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google AdSense Meta Tag Verification */}
        <meta name="google-adsense-account" content="ca-pub-4528898772462835" />

        {/* Google AdSense Script */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4528898772462835"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen flex flex-col bg-white text-neutral-900`}>
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}