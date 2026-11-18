import type { Metadata, Viewport } from "next";
import { ExperienceControls, ExperienceProvider } from "@/components/Experience";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mi Navidad Mágica",
  description: "Una aventura navideña con Santa para escribir tu carta, decorar tu árbol y soñar en grande.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1a33",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only-focusable fixed left-3 top-3 z-50 rounded-full bg-oro-500 px-4 py-2 font-semibold text-noche-950"
        >
          Saltar al contenido
        </a>
        <ExperienceProvider>
          {children}
          <ExperienceControls />
        </ExperienceProvider>
      </body>
    </html>
  );
}
