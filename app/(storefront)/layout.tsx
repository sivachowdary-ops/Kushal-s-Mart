import { Suspense } from "react";
import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { WhatsAppButton } from "@/components/storefront/whatsapp-button";
import { CartProvider } from "@/lib/cart-context";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { NavigationProgress } from "@/components/storefront/navigation-progress";

/**
 * Layout wrapper for all customer-facing storefront pages.
 * Includes sticky header, footer, floating WhatsApp button, Cart Drawer context, and instant top progress bar.
 */
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
      <CartDrawer />
    </CartProvider>
  );
}
