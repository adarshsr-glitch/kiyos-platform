import type { Metadata } from "next";
import { Inter, Inter_Tight, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ViewProvider } from "@/lib/view-context";
import { JourneyBar } from "@/prototype/journey-bar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display face for the customer workspace: headings and headline figures.
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kiyos",
  description: "Cross-border tax advisory for NRIs and returning NRIs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${interTight.variable} ${playfair.variable} font-[family-name:var(--font-inter)] antialiased`}
      >
        <ViewProvider>
          <JourneyBar />
          {children}
        </ViewProvider>
        <Toaster />
      </body>
    </html>
  );
}
