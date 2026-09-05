import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { WhatsAppButton } from "@/components/storefront/whatsapp-button";
import { CartProvider } from "@/lib/cart-context";
import { CartDrawer } from "@/components/storefront/cart-drawer";

/**
 * Layout wrapper for all customer-facing storefront pages.
 * Includes sticky header, footer, floating WhatsApp button, and Cart Drawer context.
 */
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
      <CartDrawer />
    </CartProvider>
  );
}
