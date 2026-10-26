import "./globals.css";
import { Fraunces, Inter } from "next/font/google";

const display = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata = { title: "WhiteRose SmartDine", description: "QR ordering, counter voice alerts and kitchen display" };
export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
