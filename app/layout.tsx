import type { Metadata } from "next";

import Sidebar from "@/components/Sidebar";

import "./globals.css";

export const metadata: Metadata = {
  title: "Manager Tools",
  description:
    "Herramientas de gestión para Evolution Soccer Online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <div className="flex min-h-screen bg-slate-900">
          <Sidebar />

          <main
            className="
              min-w-0
              flex-1
              p-8
              text-white
            "
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}