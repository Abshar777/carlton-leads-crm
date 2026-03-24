import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Carlton CRM",
  description: "Customer Relationship Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
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
