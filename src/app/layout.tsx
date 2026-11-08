import type { Metadata } from "next";
import { Caveat, IM_Fell_English, IM_Fell_English_SC, Lora } from "next/font/google";
import { SiteHeader } from "@/components/site/SiteHeader";
import "./globals.css";

// next/font downloads these at build time and serves them from our own
// server. Each one exposes a CSS variable that globals.css picks up.

// Headings: IM Fell, digitised from 17th-century printing types.
const fell = IM_Fell_English({
  variable: "--font-fell",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

// Labels: the same family's small-caps cut.
const fellSmallCaps = IM_Fell_English_SC({
  variable: "--font-fell-sc",
  weight: "400",
  subsets: ["latin"],
});

// Body text: Lora, a warm, very readable book serif.
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

// Donor notes: Caveat, a relaxed handwriting face, so notes feel written.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Pages set just their own name ("Sign in"); the template adds the site name.
  title: { default: "Colour for Community", template: "%s · Colour for Community" },
  description:
    "A book of colouring pages where every section is a neighbour's real need. Fund one and watch it colour in.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fell.variable} ${fellSmallCaps.variable} ${lora.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
