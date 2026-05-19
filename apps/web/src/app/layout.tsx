import type { Metadata, Viewport } from 'next';
import { Anton, Montserrat, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const wordmark = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-wordmark-loaded',
  display: 'swap',
});

const display = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-display-loaded',
  display: 'swap',
});

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-loaded',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://hal-meetings.vercel.app'),
  title: 'Hal — the meeting agent that goes for you',
  description:
    'An autonomous, self-hostable meeting agent. Connect your calendar once; Hal joins Google Meet, Zoom, and Microsoft Teams on your behalf, listens, speaks when you want it to, and follows up after.',
  keywords: [
    'meeting agent',
    'ai meeting bot',
    'read ai alternative',
    'open source meeting assistant',
    'google meet bot',
    'zoom bot',
    'teams bot',
    'self-hosted',
  ],
  openGraph: {
    title: 'Hal — the meeting agent that goes for you',
    description:
      'Autonomous, self-hostable. Hal joins Meet, Zoom, and Teams on your behalf.',
    type: 'website',
    siteName: 'Hal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hal — the meeting agent that goes for you',
    description:
      'Autonomous, self-hostable. Hal joins Meet, Zoom, and Teams on your behalf.',
  },
};

export const viewport: Viewport = {
  themeColor: '#dfff9d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${wordmark.variable} ${display.variable} ${sans.variable}`}>
      <body
        style={{
          fontFamily: 'var(--font-sans-loaded), var(--font-sans)',
        }}
      >
        <style>{`
          :root {
            --font-display: ${display.style.fontFamily}, 'Montserrat', ui-sans-serif, system-ui, sans-serif;
            --font-sans: ${sans.style.fontFamily}, 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
