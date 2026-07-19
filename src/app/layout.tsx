import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ProjectAuthProvider } from "@/components/auth-wrapper";
import { ThemeProvider } from "@/components/theme-provider";
import { DemoBar } from "@/components/demo-bar";
import { syncUser } from "@/lib/auth-sync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TallerDesk - Plataforma SaaS para Talleres Automotrices",
  description: "Gestión inteligente de órdenes de trabajo, inventarios, clientes y portal de seguimiento seguro para talleres mecánicos, detailing y servicios automotrices.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dbUser = await syncUser();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
        <ProjectAuthProvider dbUser={dbUser}>
          <ThemeProvider>
            {children}
            <DemoBar />
          </ThemeProvider>
        </ProjectAuthProvider>
      </body>
    </html>
  );
}
