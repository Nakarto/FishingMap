import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FishingMap — สำรวจจุดตกปลา',
    short_name: 'FishingMap',
    description: 'แผนที่จุดตกปลาและสถานที่เกี่ยวข้อง',
    start_url: '/',
    display: 'standalone',
    background_color: '#071319',
    theme_color: '#081319',
    icons: [
      { src: '/fishingmap-logo.png', sizes: '1254x1254', type: 'image/png', purpose: 'any' },
      { src: '/fishingmap-logo.png', sizes: '1254x1254', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
