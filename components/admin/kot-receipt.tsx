"use client";

import { formatPrice, formatDate } from "@/lib/utils";
import { getStoreBranch } from "@/lib/stores";

interface KotReceiptProps {
  paperSize?: "58mm" | "80mm";
  storeBranchId?: string;
  order: {
    orderNumber: string;
    channel: "ONLINE" | "OFFLINE";
    storeBranch?: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    shippingAddress?: {
      address: string;
      city: string;
      state: string;
      pincode: string;
    };
    items: {
      productName: string;
      variantName: string;
      quantity: number;
      unitPrice: number; // paise
      lineTotal: number; // paise
    }[];
    subtotal: number; // paise
    discount: number; // paise
    total: number; // paise
    paymentStatus: string;
    paymentMode?: string;
    createdAt: string;
  };
}

export function KotReceipt({ order, paperSize = "58mm", storeBranchId }: KotReceiptProps) {
  const is58mm = paperSize === "58mm";
  const branch = getStoreBranch(storeBranchId || order.storeBranch);

  return (
    <div
      className={`kot-print-area font-mono text-black bg-white p-2 sm:p-4 mx-auto ${
        is58mm ? "max-w-[48mm] text-[9px] leading-snug" : "max-w-[72mm] text-[11px] leading-tight"
      }`}
    >
      {/* Store Header */}
      <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
        <h1 className={`${is58mm ? "text-xs" : "text-sm"} font-black tracking-wider`}>
          KUSHAL&apos;S MART
        </h1>
        <p className="text-[8px] sm:text-[9px] font-bold text-gray-800">{branch.name}</p>
        <p className="text-[8px] sm:text-[9px] text-gray-600">{branch.address}</p>
        <p className="text-[8px] sm:text-[9px] text-gray-600">{branch.city}, {branch.state} - {branch.pincode}</p>
        <p className="text-[8px] sm:text-[9px] font-bold mt-1">GSTIN: {branch.gstin}</p>
        <p className="text-[8px] sm:text-[9px]">Ph: {branch.phone}</p>
      </div>

      {/* Order Info */}
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2 space-y-0.5">
        <div className="flex justify-between">
          <span className="font-bold">Order #</span>
          <span className="font-bold">{order.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span className="text-[8px] sm:text-[10px]">{formatDate(order.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Channel</span>
          <span className="font-bold">{order.channel}</span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2 space-y-0.5">
        <div className="flex justify-between">
          <span>Customer</span>
          <span className="font-bold text-right max-w-[55%] truncate">{order.customerName}</span>
        </div>
        <div className="flex justify-between">
          <span>Phone</span>
          <span>{order.customerPhone}</span>
        </div>
        {order.shippingAddress && (
          <div className="mt-1">
            <span className="font-bold block">Ship To:</span>
            <span className="text-[8px] sm:text-[9px] block">{order.shippingAddress.address}</span>
            <span className="text-[8px] sm:text-[9px] block">
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
            </span>
          </div>
        )}
      </div>

      {/* Items Table Header */}
      <div className="flex justify-between font-bold border-b border-gray-400 pb-1 mb-1 text-[9px] uppercase">
        <span className="flex-1 truncate">Item</span>
        <span className="w-6 text-center">Qty</span>
        <span className="w-12 text-right">Amt</span>
      </div>

      {/* Items List */}
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2 space-y-1">
        {order.items.map((item, idx) => (
          <div key={idx}>
            <div className="font-bold truncate">{item.productName}</div>
            <div className="flex justify-between text-gray-700">
              <span className="flex-1 text-[8px] sm:text-[9px] truncate">{item.variantName}</span>
              <span className="w-6 text-center font-bold">x{item.quantity}</span>
              <span className="w-12 text-right font-bold">{formatPrice(item.lineTotal)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-0.5 border-b border-dashed border-gray-400 pb-2 mb-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Discount</span>
            <span>-{formatPrice(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Shipping</span>
          <span className="font-bold">FREE</span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm font-black border-t border-gray-400 pt-1 mt-1">
          <span>TOTAL</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Payment Info */}
      <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
        <div className="flex justify-between">
          <span>Status</span>
          <span className="font-bold">{order.paymentStatus}</span>
        </div>
        {order.paymentMode && (
          <div className="flex justify-between">
            <span>Payment Mode</span>
            <span className="font-bold">{order.paymentMode}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[8px] sm:text-[9px] space-y-0.5 pt-1">
        <p className="font-bold">Thank you for shopping!</p>
        <p>Support: +91 7288 907 757</p>
        <p className="mt-1 text-gray-500">— End of KOT Receipt —</p>
      </div>
    </div>
  );
}

/**
 * Trigger print for thermal KOT receipt.
 */
export function printKot() {
  window.print();
}
