import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Odonto.IA',
    short_name: 'Odonto.IA',
    description: 'Prontuário odontológico estruturado por voz.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0d0d0d',
    theme_color: '#0d0d0d',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
