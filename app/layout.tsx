import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-context";
import { GoogleTagManager, GoogleTagManagerNoScript } from "@/components/analytics/google-tag-manager";
import { BrandProvider } from "@/lib/brand-context";
import { getBrand } from "@/lib/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'Ventas Tecate - Compra y Vende en Tecate',
    template: '%s | Ventas Tecate',
  },
  description: 'Marketplace local de Tecate. Compra y vende productos de segunda mano, muebles, electrónica, vehículos y más en tu comunidad.',
  keywords: [
    'Ventas Tecate',
    'marketplace Tecate',
    'compra venta Tecate',
    'segunda mano',
    'clasificados Tecate',
    'vender en Tecate',
    'comprar en Tecate',
  ],
  authors: [{ name: 'Ventas Tecate' }],
  creator: 'Ventas Tecate',
  publisher: 'Ventas Tecate',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://ventastecate.com'),
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://ventastecate.com',
    siteName: 'Ventas Tecate',
    title: 'Ventas Tecate - Compra y Vende en Tecate',
    description: 'Marketplace local de Tecate. Compra y vende productos en tu comunidad.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ventas Tecate',
    description: 'Marketplace local de Tecate',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here when you have them
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers()
  const hostname = headersList.get('host') ?? ''
  const { name: brandName } = getBrand(hostname)

  return (
    <html lang="es-MX">
      <head>
        <GoogleTagManager />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleTagManagerNoScript />
        <AuthProvider>
          <BrandProvider brandName={brandName}>
            {children}
          </BrandProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
