import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata = {
  title: "Control de Abordaje | Transporte de Personal",
  description: "Sistema de control de abordaje y trazabilidad de pasajeros",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#186241",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${inter.variable} ${manrope.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
