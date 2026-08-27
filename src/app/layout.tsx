import type { Metadata } from 'next';
import Script from 'next/script';
import { DM_Serif_Display, Outfit, DM_Mono, Geist } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PwaLaunchIntro } from '@/components/pwa/pwa-launch-intro';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

const dmSerif = DM_Serif_Display({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-dm-serif',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://odontoia.app'),
  title: 'Odonto.IA | Inteligência Odontológica',
  description: 'Micro-SaaS odontológico para dentistas.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Odonto.IA',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={cn(dmSerif.variable, outfit.variable, dmMono.variable, "font-sans", geist.variable)} suppressHydrationWarning>
      <body className="bg-bg text-text-primary font-sans antialiased min-h-screen flex flex-col" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PwaLaunchIntro>{children}</PwaLaunchIntro>
          <Toaster />
        </ThemeProvider>
        <Script id="pwa-launch-detection" strategy="beforeInteractive">
          {`try {
            var pwaDisplayModes = ['standalone', 'fullscreen', 'minimal-ui'];
            var pwaStandalone = pwaDisplayModes.some(function (mode) {
              return window.matchMedia('(display-mode: ' + mode + ')').matches;
            }) || window.navigator.standalone === true || document.referrer.indexOf('android-app://') === 0;

            if (pwaStandalone) {
              document.documentElement.dataset.pwaLaunch = 'pending';
              window.setTimeout(function () {
                if (document.documentElement.dataset.pwaLaunch === 'pending') {
                  document.documentElement.removeAttribute('data-pwa-launch');
                }
              }, 2500);
            }
          } catch {}`}
        </Script>
      </body>
    </html>
  );
}
