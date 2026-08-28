import "./globals.css";
import "./ditto.css";
import type { ReactNode } from "react";
import { SITE_ORIGIN } from "../lib/site";

export const metadata = {
  "metadataBase": new URL(SITE_ORIGIN || "http://localhost:3000"),
  "title": "AEGIS | Operator Briefing",
  "description": "AEGIS: Dual-Agent Smart Scan Scheduler for Electronic-Support (ES) receivers.",
  "alternates": {
    "canonical": "/"
  },
  "openGraph": {
    "title": "AEGIS | Operator Briefing",
    "description": "AEGIS: Dual-Agent Smart Scan Scheduler for Electronic-Support (ES) receivers.",
    "url": "/",
    "images": [
      "https://a.storyblok.com/f/288034353253643/1200x630/17bab97d71/og-home.jpg"
    ]
  },
  "twitter": {
    "card": "summary_large_image",
    "title": "AEGIS | Operator Briefing",
    "description": "AEGIS: Dual-Agent Smart Scan Scheduler for Electronic-Support (ES) receivers.",
    "images": [
      "https://a.storyblok.com/f/288034353253643/1200x630/17bab97d71/og-home.jpg"
    ]
  },
  "icons": {
    "icon": [
      {
        "url": "/favicon.ico"
      },
      {
        "url": "/icon.svg",
        "type": "image/svg+xml"
      },
      {
        "url": "/icon.png",
        "type": "image/png",
        "sizes": "512x512"
      }
    ],
    "shortcut": [
      {
        "url": "/favicon.ico"
      }
    ],
    "apple": [
      {
        "url": "/apple-touch-icon.png",
        "sizes": "180x180"
      }
    ]
  },
  "manifest": "/assets/cloned/manifest/d2839aeacf09.webmanifest"
};
export const viewport = {
  "width": "device-width",
  "initialScale": 1
};


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={"en"}>
      <body className="block text-foreground [font-family:'Google_Sans',_sans-serif] text-[0.625rem] font-light not-italic leading-[0.8125rem] tracking-[normal] [word-spacing:0px] text-start normal-case whitespace-normal [word-break:normal] [overflow-wrap:normal] indent-0 [text-shadow:none] [font-variant-caps:normal] [font-feature-settings:normal] list-outside [writing-mode:horizontal-tb] [direction:ltr] bg-background" data-cid="n0">
        {children}
      </body>
    </html>
  );
}
