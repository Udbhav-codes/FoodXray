import type { Metadata, Viewport } from "next";
import { Baloo_2, Hind, IBM_Plex_Mono } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

/* Both display and body faces carry Devanagari and Latin in one family, so
   Hindi and English headings match in weight and mood (spec §14.3). */
const baloo = Baloo_2({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-baloo",
  display: "swap",
});

const hind = Hind({
  subsets: ["latin", "devanagari"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hind",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PoshanLens — Read any food label",
  description:
    "Point your camera at any ingredient list. Get a verdict you can actually understand, in your language, for your body — and know what to buy instead.",
  applicationName: "PoshanLens",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PoshanLens", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Never cap zoom — spec §14.9 requires the layout to survive 200% scaling.
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#fafcf7",
};

/** Applies the saved theme before first paint so there is no light flash. */
const THEME_SCRIPT = `
(function(){try{
  var s=localStorage.getItem('poshanlens.v1');
  var t='system', l='en';
  if(s){var p=JSON.parse(s); t=p.theme||'system'; l=p.lang||'en';}
  var d = t==='dark' || (t==='system' && matchMedia('(prefers-color-scheme: dark)').matches);
  if(d) document.documentElement.classList.add('dark');
  document.documentElement.lang = l;
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Font variables live on <html> so :root can reference them; on <body>
    // they would be invisible to any :root-level custom property.
    <html
      lang="en"
      className={`${baloo.variable} ${hind.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <StoreProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand focus:px-5 focus:py-3 focus:text-on-brand"
          >
            Skip to content
          </a>
          <main id="main" className="min-h-dvh">
            {children}
          </main>
          <BottomNav />
        </StoreProvider>
      </body>
    </html>
  );
}
