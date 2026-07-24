import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mecsek Klíma – ajánlatkérő és utánkövető demó",
  description: "Működő magyar nyelvű demórendszer klíma- és hőszivattyú-szakembereknek.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Mecsek Klíma",
    description: "Minden érdeklődőnek legyen következő lépése.",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Mecsek Klíma demórendszer" }],
  },
  twitter: { card: "summary_large_image", title: "Mecsek Klíma", description: "Minden érdeklődőnek legyen következő lépése.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="hu"><body>{children}</body></html>;
}
