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
  // relative URLs in page metadata (canonical, og) resolve against this; each page sets its own canonical
  metadataBase: new URL("https://www.staygoch.com"),
  title: "STAYGO - เว็บไซต์เกมและเครื่องมือสำหรับเล่นเกม",
  description: "เว็บไซต์สำหรับเล่นเกมออนไลน์และเครื่องมือช่วยเล่นเกมต่างๆ จากช่อง STAYGO",
  keywords: "STAYGO, เกมออนไลน์, เครื่องมือเล่นเกม, Board Game, ทอยลูกเต๋า, จับเวลา, สุ่มทีม",
  authors: [{ name: "STAYGO" }],
  robots: "index, follow",
  icons: {
    icon: "/games/reveal-board/staygo-logo.png",
    shortcut: "/games/reveal-board/staygo-logo.png",
    apple: "/games/reveal-board/staygo-logo.png",
  },
  openGraph: {
    title: "STAYGO - เว็บไซต์เกมและเครื่องมือสำหรับเล่นเกม",
    description: "เว็บไซต์สำหรับเล่นเกมออนไลน์และเครื่องมือช่วยเล่นเกมต่างๆ จากช่อง STAYGO",
    url: "https://www.staygoch.com",
    siteName: "STAYGO",
    locale: "th_TH",
    type: "website",
    images: [
      {
        url: "https://www.staygoch.com/assets/image/share/page-site.jpg",
        width: 1200,
        height: 630,
        alt: "STAYGO — เกมปาร์ตี้และเครื่องมือช่วยเล่นเกม",
      },
    ],
  },
  // X/Twitter reads og:title, og:description and og:image when these are absent, so pages only set openGraph
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Structured data for search engines
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "STAYGO",
    "url": "https://www.staygoch.com",
    "logo": "https://www.staygoch.com/games/reveal-board/staygo-logo.png",
    "description": "เว็บไซต์สำหรับเล่นเกมออนไลน์และเครื่องมือช่วยเล่นเกมต่างๆ จากช่อง STAYGO",
    "sameAs": [
      "https://www.youtube.com/@STAYGO"
    ]
  };

  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "STAYGO",
    "url": "https://www.staygoch.com",
    "description": "เว็บไซต์เกมและเครื่องมือสำหรับเล่นเกม",
    "publisher": {
      "@type": "Organization",
      "name": "STAYGO",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.staygoch.com/games/reveal-board/staygo-logo.png"
      }
    }
  };

  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script src="/assets/js/analytics.js" defer></script>
        
        {/* Structured Data for Search Engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
      </head>
      <body className={`${inter.variable} ${kanit.variable}`}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
