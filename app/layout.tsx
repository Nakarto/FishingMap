import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'FishingMap — สำรวจจุดตกปลา',
  description: 'แผนที่จุดตกปลา ร้านอุปกรณ์ ร้านเหยื่อ และเรือตกปลาในนครศรีธรรมราช',
  icons: {
    icon: '/fishingmap-logo.png',
    shortcut: '/fishingmap-logo.png',
    apple: '/fishingmap-logo.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
