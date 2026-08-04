import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hatico Manager',
    short_name: 'Hatico',
    description: 'Hệ thống quản lý công việc và báo cáo hàng ngày đa phân cấp',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#09090b',
    icons: [
      {
        src: '/logo/favicon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo/favicon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
