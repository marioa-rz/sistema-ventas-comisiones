import type { MetadataRoute } from 'next';
import { siteUrl } from '../lib/site-url';

const publicRoutes = ['/', '/aviso-legal', '/privacidad', '/cookies'];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
    changeFrequency: route === '/' ? 'weekly' : 'yearly',
    priority: route === '/' ? 1 : 0.3,
  }));
}
