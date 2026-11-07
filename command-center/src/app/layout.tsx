import './globals.css';
import type { Metadata, Viewport } from 'next';
export const metadata: Metadata = { title: 'Command Center', description: 'Multi-agent AI automation dashboard' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0b0d12' };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body className="min-h-screen bg-bg antialiased">{children}</body></html>;
}
