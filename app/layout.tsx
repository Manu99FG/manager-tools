import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import "./globals.css";
import "./competition-formats.css";

export const metadata: Metadata = {
  title: {
    default: "Liga de Leyendas · Manager Tools",
    template: "%s · Liga de Leyendas",
  },
  description: "Base de datos oficial de Liga de Leyendas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <div className="mt-app-shell">
          <Sidebar />
          <main className="mt-main">
            <div className="mt-content">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
