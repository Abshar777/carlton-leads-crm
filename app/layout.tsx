import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Carlton CRM",
  description: "Carlton Customer Relationship Management System",
  applicationName: "Carlton CRM",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Carlton CRM",
  },
  formatDetection: {
    telephone: false,
  },
  // Open Graph (looks good when shared)
  openGraph: {
    type: "website",
    siteName: "Carlton CRM",
    title: "Carlton CRM",
    description: "Carlton Customer Relationship Management System",
  },
};

// Separate viewport export (required by Next.js 14)
export const viewport: Viewport = {
  themeColor: "#6d28d9",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",        // respect iPhone notch / safe areas
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* iOS standalone splash / status bar */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Carlton CRM" />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "hsl(222.2 84% 4.9%)",
                border: "1px solid hsl(217.2 32.6% 17.5%)",
                color: "hsl(210 40% 98%)",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
