import type { Metadata, Viewport } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Minha Agenda",
  description: "Agenda pessoal com notas, voz, imagens e integração Trello",
  applicationName: "Minha Agenda",
  appleWebApp: {
    capable: true,
    title: "Agenda",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full w-full overflow-hidden">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
