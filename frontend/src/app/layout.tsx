import type { Metadata, Viewport } from "next";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartNotice } from "@/components/cart/cart-notice";
import { CartSync } from "@/components/cart/cart-sync";
import { QueryProvider } from "@/components/providers/query-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "momus collective",
  description: "Shirts with something to say.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
  modal,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fontVariables} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ink font-sans text-bone">
        <QueryProvider>
          <AuthBootstrap />
          <CartSync />
          <SiteNav />
          <CartNotice />
          {children}
          {modal}
          <SiteFooter />
          <CartDrawer />
        </QueryProvider>
      </body>
    </html>
  );
}
