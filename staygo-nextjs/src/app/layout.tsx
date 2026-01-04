import type { Metadata } from "next";
import { Inter, Kanit } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const kanit = Kanit({
  variable: "--font-kanit",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "thai"],
});

export const metadata: Metadata = {
  title: "STAYG0 - เว็บไซต์เกมและเครื่องมือสำหรับเล่นเกม",
  description: "เว็บไซต์สำหรับเล่นเกมออนไลน์และเครื่องมือช่วยเล่นเกมต่างๆ จากช่อง STAYG0",
  keywords: "STAYG0, เกมออนไลน์, เครื่องมือเล่นเกม, Board Game, ทอยลูกเต๋า, จับเวลา, สุ่มทีม",
  authors: [{ name: "STAYG0" }],
  robots: "index, follow",
  icons: {
    icon: "/games/reveal-board/staygo-logo.png",
    shortcut: "/games/reveal-board/staygo-logo.png",
    apple: "/games/reveal-board/staygo-logo.png",
  },
  openGraph: {
    title: "STAYG0 - เว็บไซต์เกมและเครื่องมือสำหรับเล่นเกม",
    description: "เว็บไซต์สำหรับเล่นเกมออนไลน์และเครื่องมือช่วยเล่นเกมต่างๆ จากช่อง STAYG0",
    url: "https://staygoch.com",
    siteName: "STAYG0",
    locale: "th_TH",
    type: "website",
    images: [
      {
        url: "https://staygoch.com/games/reveal-board/staygo-logo.png",
        width: 512,
        height: 512,
        alt: "STAYG0 Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "STAYG0 - เว็บไซต์เกมและเครื่องมือสำหรับเล่นเกม",
    description: "เว็บไซต์สำหรับเล่นเกมออนไลน์และเครื่องมือช่วยเล่นเกมต่างๆ จากช่อง STAYG0",
    images: ["https://staygoch.com/games/reveal-board/staygo-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="canonical" href="https://staygoch.com/" />
      </head>
      <body className={`${inter.variable} ${kanit.variable}`}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
