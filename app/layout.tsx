import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OA Football',
  description: 'OA Football - NFL Survivor Pool',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
};

// Next 15 wants viewport as its own export; inside `metadata` it still works
// but warns on every build.
//
// The old config also set maximumScale: 1 / userScalable: false. Next was
// silently dropping those, so pinch-zoom worked by accident - they are left
// out deliberately now, because blocking zoom fails WCAG 1.4.4 and would have
// started biting the moment this moved to the supported export.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
