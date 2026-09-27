import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata: Metadata = {
  // Social crawlers must use the public domain, not a protected deployment URL.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://fishing-map-sea.vercel.app'),
  title: 'FishingMap — สำรวจจุดตกปลา',
  description: 'แผนที่จุดตกปลา ร้านอุปกรณ์ ร้านเหยื่อ และเรือตกปลาในนครศรีธรรมราช',
  openGraph: {
    title: 'FishingMap — สำรวจจุดตกปลา',
    description: 'แผนที่จุดตกปลา ร้านอุปกรณ์ ร้านเหยื่อ และเรือตกปลาในนครศรีธรรมราช',
    type: 'website',
    locale: 'th_TH',
    url: '/',
    images: [{ url: '/fishingmap-preview.png', width: 1730, height: 909, type: 'image/png', alt: 'FishingMap แผนที่จุดตกปลา นครศรีธรรมราช' }],
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
