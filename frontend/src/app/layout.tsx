import type { Metadata, Viewport } from "next";
import { preconnect } from "react-dom";
import Script from "next/script";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartNotice } from "@/components/cart/cart-notice";
import { CartSync } from "@/components/cart/cart-sync";
import { MotionProvider } from "@/components/providers/motion-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Toaster } from "@/components/ui/toaster";
import { API_URL } from "@/lib/api";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "momus collective",
  description: "Shirts with something to say.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  // Every page calls the API from the browser (session, bag, categories);
  // warming the connection saves a round trip on slow networks.
  preconnect(new URL(API_URL).origin, { crossOrigin: "use-credentials" });
  return (
    <html
      lang="en"
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col bg-ink font-sans text-bone"
        suppressHydrationWarning
      >
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {"try { if (localStorage.getItem('momus-theme') === 'light') document.documentElement.dataset.theme = 'light'; } catch {}"}
        </Script>
        <noscript>
          <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        <a
          href="#content"
          className="sr-only z-[80] bg-laurel px-4 py-3 font-semibold text-ink focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4"
        >
          Skip to content
        </a>
        <QueryProvider>
          <MotionProvider>
            <AuthBootstrap />
            <CartSync />
            <SiteNav />
            <CartNotice />
            <div id="content" className="flex flex-1 flex-col">
              {children}
            </div>
            <SiteFooter />
            <CartDrawer />
            <Toaster />
          </MotionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
