import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* iOS standalone splash / status bar */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Carlton CRM" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <NextTopLoader
            color="#3b82f6"
            shadow="0 0 10px #3b82f6, 0 0 5px #3b82f6"
            height={3}
            showSpinner={false}
            easing="ease"
            speed={200}
          />
          <QueryProvider>
            {children}
            <Toaster
              theme="system"
              position="bottom-right"
              richColors
              closeButton
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
