"use client";

import { use, useEffect, useState } from "react";
import { useAdminStore } from "@/lib/admin-store";
import { KotReceipt, printKot } from "@/components/admin/kot-receipt";
import Link from "next/link";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";

export default function OrderKotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { orders, orderItems, isLoading, refreshOrders } = useAdminStore();
  const [paperSize, setPaperSize] = useState<"58mm" | "80mm">("58mm");
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    refreshOrders().then(() => setIsInitializing(false));
  }, [refreshOrders]);

  const order = orders.find((o) => o.id === id);
  const items = orderItems.filter((i) => i.order_id === id);

  if (isInitializing || (isLoading && !order)) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F5F7]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] p-8 flex flex-col items-center justify-center">
        <p className="text-gray-600 font-bold mb-4">Order not found</p>
        <Link href="/admin/orders" className="text-blue-600 font-semibold hover:underline">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  // Format order object to match KotReceipt interface
  const formattedOrder = {
    orderNumber: order.order_number,
    channel: order.channel,
    customerName: order.customer_name || "Guest Customer",
    customerPhone: order.customer_phone || "N/A",
    customerEmail: order.customer_email || undefined,
    shippingAddress: order.shipping_address as { address: string; city: string; state: string; pincode: string } | undefined,
    items: items.map((i) => ({
      productName: i.product_name,
      variantName: i.variant_name || "Standard",
      quantity: i.quantity,
      unitPrice: i.unit_price,
      lineTotal: i.line_total,
    })),
    subtotal: order.subtotal,
    discount: order.discount || 0,
    total: order.total,
    paymentStatus: order.payment_status,
    paymentMode: order.payment_mode || undefined,
    createdAt: order.created_at,
  };

  const handlePrintOrPdf = () => {
    const printArea = document.querySelector(".kot-print-area");
    if (!printArea) {
      window.print();
      return;
    }

    // Open dedicated print window for reliable PDF rendering
    const printWin = window.open("", "_blank", "width=600,height=700");
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>KOT_Receipt_${order.order_number}</title>
            <style>
              body {
                font-family: monospace;
                margin: 0;
                padding: 10px;
                display: flex;
                justify-content: center;
                color: #000;
              }
              .receipt-wrap {
                width: ${paperSize === "58mm" ? "48mm" : "72mm"};
                font-size: ${paperSize === "58mm" ? "10px" : "12px"};
                line-height: 1.3;
              }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              .border-b { border-bottom: 1px dashed #666; }
              .flex { display: flex; justify-content: space-between; }
              .py-1 { padding-top: 4px; padding-bottom: 4px; }
              .my-2 { margin-top: 8px; margin-bottom: 8px; }
              @page { size: auto; margin: 3mm; }
            </style>
          </head>
          <body>
            <div class="receipt-wrap">
              ${(printArea.innerHTML || "").replace(/<script[\s\S]*?<\/script>/gi, "")}
            </div>
            <script>
              window.onload = function() {
                window.focus();
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    } else {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] pb-12">
      {/* Control Bar (Hidden on print) */}
      <div className="no-print bg-white border-b border-gray-200 py-4 px-6 shadow-xs sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href={`/admin/orders/${order.id}`}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Order</span>
            </Link>
            <div>
              <h1 className="text-sm font-black text-gray-900">KOT Receipt #{order.order_number}</h1>
              <p className="text-[11px] text-gray-500 font-medium">Thermal slip / Counter Packing ticket</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Paper Size selector */}
            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaperSize("58mm")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  paperSize === "58mm" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                58mm (2 Inch)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize("80mm")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  paperSize === "80mm" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                80mm (3 Inch)
              </button>
            </div>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrintOrPdf}
              className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Helper Tip */}
      <div className="no-print max-w-md mx-auto mt-4 px-4 text-center">
        <p className="text-[11px] text-gray-500">
          💡 To download as PDF: Click <b>Print / Download PDF</b> and select <b>Save as PDF</b> as destination.
        </p>
      </div>

      {/* Printable Receipt Paper Container */}
      <div className="mt-6 flex justify-center px-4">
        <div className="bg-white shadow-xl rounded-2xl p-4 sm:p-6 border border-gray-200/80">
          <KotReceipt order={formattedOrder} paperSize={paperSize} />
        </div>
      </div>
    </div>
  );
}