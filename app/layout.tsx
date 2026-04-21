import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ship Down",
  description: "Minimalistisches Schifferlversenken fuer zwei Geraete.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
