import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')),
  title: 'FishingMap — สำรวจจุดตกปลา',
  description: 'แผนที่จุดตกปลา ร้านอุปกรณ์ ร้านเหยื่อ และเรือตกปลาในนครศรีธรรมราช',
  openGraph: {
    title: 'FishingMap — สำรวจจุดตกปลา',
    description: 'แผนที่จุดตกปลา ร้านอุปกรณ์ ร้านเหยื่อ และเรือตกปลาในนครศรีธรรมราช',
    type: 'website',
    locale: 'th_TH',
    images: [{ url: '/fishingmap-preview.png', width: 1734, height: 907, alt: 'FishingMap แผนที่จุดตกปลา นครศรีธรรมราช' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FishingMap — สำรวจจุดตกปลา',
    description: 'แผนที่จุดตกปลา ร้านอุปกรณ์ ร้านเหยื่อ และเรือตกปลาในนครศรีธรรมราช',
    images: ['/fishingmap-preview.png'],
  },
  icons: {
    icon: '/fishingmap-logo.png',
    shortcut: '/fishingmap-logo.png',
    apple: '/fishingmap-logo.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
