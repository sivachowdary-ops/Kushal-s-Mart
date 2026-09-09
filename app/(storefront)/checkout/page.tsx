"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, Truck, ArrowLeft, ShoppingBag, CreditCard, AlertCircle, Zap } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/utils";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cartItems, subtotal, clearCart, isLoaded } = useCart();

  const isBuyNow = searchParams.get("buyNow") === "1";

  // Express checkout item (if arriving from "Buy It Now")
  const expressItem = useMemo(() => {
    if (!isBuyNow) return null;
    const productId = searchParams.get("productId") || "";
    const variantId = searchParams.get("variantId") || "default";
    const variantName = searchParams.get("variantName") || "Standard";
    const productName = searchParams.get("productName") || "Product";
    const price = parseInt(searchParams.get("price") || "0", 10);
    const image = searchParams.get("image") || "";
    const quantity = parseInt(searchParams.get("qty") || "1", 10);
    if (!productId) return null;
    return {
      id: `express-${productId}-${variantId}`,
      productId,
      variantId,
      variantName,
      name: productName,
      price,
      image,
      quantity,
    };
  }, [isBuyNow, searchParams]);

  const activeItems = isBuyNow && expressItem ? [expressItem] : cartItems;
  const activeSubtotal = isBuyNow && expressItem ? expressItem.price * expressItem.quantity : subtotal;

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    address: "",
    city: "",
    state: "Andhra Pradesh",
    pincode: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Preload Razorpay Checkout script on mount
  const [razorpayReady, setRazorpayReady] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if already loaded
      if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
        setRazorpayReady(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setRazorpayReady(true);
      script.onerror = () => console.error("[Razorpay] Failed to load checkout script");
      document.head.appendChild(script);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Validation
    if (!formData.customerName || !formData.customerPhone || !formData.address || !formData.city || !formData.pincode) {
      setErrorMessage("Please fill in all required shipping fields.");
      return;
    }
    if (formData.customerPhone.replace(/\D/g, "").length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (formData.pincode.replace(/\D/g, "").length !== 6) {
      setErrorMessage("Please enter a valid 6-digit PIN code.");
      return;
    }
    if (activeItems.length === 0) {
      setErrorMessage("Your cart is empty.");
      return;
    }

    setIsSubmitting(true);

    try {
      // ── Step 1: Create Order in DB & Razorpay ──────────────────────────────
      const orderRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: formData.customerName.trim(),
          customer_phone: formData.customerPhone.trim(),
          customer_email: formData.customerEmail.trim() || undefined,
          shipping_address: {
            address: formData.address.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            pincode: formData.pincode.trim(),
          },
          items: activeItems.map((item) => ({
            product_id: item.productId,
            variant_id: item.variantId,
            product_name: item.name,
            variant_name: item.variantName,
            quantity: item.quantity,
            unit_price: item.price,
            image: item.image,
          })),
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to create order");

      const { order_id: orderId, order_number: orderNumber } = orderData;
      let razorpayOrderId = orderData.razorpay_order_id;
      let amount = orderData.amount;
      let currency = orderData.currency || "INR";
      let key_id = orderData.key_id;

      // Fallback: If not returned directly, create via payments endpoint
      if (!razorpayOrderId) {
        const payRes = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) throw new Error(payData.error || "Failed to initiate payment");
        razorpayOrderId = payData.razorpay_order_id;
        amount = payData.amount;
        currency = payData.currency || "INR";
        key_id = payData.key_id;
      }

      const keyToUse =
        key_id ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        "rzp_test_TXBDtvZGtRuyZn";

      // ── Step 2: Open Razorpay Checkout popup ──────────────────────────────
      const RazorpayConstructor = (window as unknown as {
        Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (event: string, cb: () => void) => void };
      }).Razorpay;

      if (!RazorpayConstructor) {
        throw new Error("Payment gateway is loading. Please try again in a moment.");
      }

      // Wrap Razorpay in a promise so we can await the result
      await new Promise<void>((resolve, reject) => {
        const options = {
          key: keyToUse,
          amount,
          currency: currency || "INR",
          order_id: razorpayOrderId,
          name: "Kushal's Mart",
          description: `Order ${orderNumber}`,
          prefill: {
            name: formData.customerName,
            email: formData.customerEmail || undefined,
            contact: formData.customerPhone,
          },
          theme: {
            color: "#E60000",
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              // Verify payment signature on server
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response),
              });

              if (!verifyRes.ok) {
                reject(new Error("Payment verification failed. Please contact support."));
                return;
              }

              // Clear cart before redirect (if not buy-now)
              if (!isBuyNow) {
                clearCart();
              }

              resolve();
            } catch {
              reject(new Error("Payment verification failed. Please contact support."));
            }
          },
          modal: {
            ondismiss: () => {
              reject(new Error("Payment was cancelled. Your order is saved — you can retry anytime."));
            },
          },
        };

        const rzp = new RazorpayConstructor(options);
        rzp.on("payment.failed", () => {
          reject(new Error("Payment failed. Please try again with a different payment method."));
        });
        rzp.open();
      });

      // Payment verified — redirect to confirmation page
      router.push(`/order/${orderNumber}`);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment failed. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded && !isBuyNow) {
    return (
      <div className="bg-[#F4F5F7] min-h-screen flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-red-600 border-t-transparent mx-auto" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loading secure checkout...</p>
        </div>
      </div>
    );
  }

  if (activeItems.length === 0) {
    return (
      <div className="bg-[#F4F5F7] min-h-screen py-16">
        <div className="mx-auto max-w-xl px-4 text-center bg-white rounded-3xl p-12 border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 mx-auto">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="font-extrabold text-xl text-gray-900">Your Cart is Empty</h2>
          <p className="text-xs text-gray-500">Add items to your cart before proceeding to checkout.</p>
          <Link href="/shop" className="inline-block rounded-full bg-black px-8 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-600 transition-colors">
            Explore Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200/80 py-6 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/cart" className="flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-red-600">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Cart</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <Lock className="h-3.5 w-3.5" />
            <span>100% Safe &amp; Verified Checkout</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handlePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left: Shipping Details */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-red-600 block mb-1">
                GUEST CHECKOUT — NO ACCOUNT NEEDED
              </span>
              <h1 className="font-extrabold text-2xl sm:text-3xl text-gray-900 tracking-tight">
                Shipping &amp; Contact Details
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Enter your details. You&apos;ll be taken to our secure payment gateway to complete payment.
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-700">{errorMessage}</p>
              </div>
            )}

            {/* Customer Details */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2">
                1. Customer Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Full Name *</label>
                  <input
                    type="text" name="customerName" required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.customerName} onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Mobile Number (10 digits) *</label>
                  <input
                    type="tel" name="customerPhone" required maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={formData.customerPhone} onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Email (Optional — for order updates)</label>
                <input
                  type="email" name="customerEmail"
                  placeholder="e.g. rahul@example.com"
                  value={formData.customerEmail} onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2">
                2. Shipping Address
              </h2>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Flat / House No. / Street Address *</label>
                <textarea
                  name="address" rows={2} required
                  placeholder="House/Flat No., Building Name, Street, Landmark"
                  value={formData.address} onChange={handleInputChange}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">City *</label>
                  <input
                    type="text" name="city" required placeholder="e.g. Kakinada"
                    value={formData.city} onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">State *</label>
                  <select
                    name="state"
                    required
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold text-gray-900 focus:border-black focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">PIN Code *</label>
                  <input
                    type="text" name="pincode" required maxLength={6} placeholder="e.g. 533432"
                    value={formData.pincode} onChange={handleInputChange}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold text-gray-900 focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
              {[
                { icon: ShieldCheck, text: "100% Verified Checkout" },
                { icon: Truck, text: "Free Express Shipping" },
                { icon: Lock, text: "Safe & Secure" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                  <item.icon className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-6 sticky top-24">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="font-extrabold text-xl text-gray-900">
                Order Summary ({activeItems.length} {activeItems.length === 1 ? "item" : "items"})
              </h2>
              {isBuyNow && (
                <span className="flex items-center gap-1 rounded-full bg-red-50 text-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border border-red-200">
                  <Zap className="h-3 w-3 fill-red-600" /> Express
                </span>
              )}
            </div>

            {/* Cart Items */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {activeItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-50 p-1.5 border border-gray-100">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-300">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xs text-gray-900 truncate">{item.name}</h3>
                    <p className="text-[10px] font-semibold text-gray-500">
                      Qty: {item.quantity}{item.variantName ? ` · ${item.variantName}` : ""}
                    </p>
                  </div>
                  <span className="font-extrabold text-xs text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2 text-xs font-semibold text-gray-600 border-t border-gray-100 pt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900">{formatPrice(activeSubtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Express Shipping</span>
                <span className="font-bold uppercase">FREE</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex justify-between items-baseline">
              <span className="font-extrabold text-base text-gray-900">Total Payable</span>
              <span className="font-extrabold text-2xl text-red-600">{formatPrice(activeSubtotal)}</span>
            </div>

            {/* Pay Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-xs font-black uppercase tracking-wider text-white shadow-xl transition-all duration-300 hover:bg-red-700 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <CreditCard className="h-5 w-5" />
              <span>
                {isSubmitting
                  ? "PROCESSING..."
                  : `PAY ${formatPrice(activeSubtotal)} SECURELY`}
              </span>
            </button>

            <p className="text-[10px] font-semibold text-gray-400 text-center">
              Powered by Razorpay · UPI, Cards, Net Banking accepted
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#F4F5F7] min-h-screen py-16 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
            <span>Loading secure checkout...</span>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
