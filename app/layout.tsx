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
        <div className="min-h-screen bg-slate-900">
          <Sidebar />

          <main
            className="
              min-w-0
              px-3
              pb-6
              pt-20
              text-white

              sm:px-4

              md:px-6

              lg:ml-64
              lg:px-8
              lg:py-8
            "
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}