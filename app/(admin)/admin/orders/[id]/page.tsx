"use client";

import { useEffect, useState, use } from "react";
import { useAdminStore } from "@/lib/admin-store";
import Link from "next/link";
import { ArrowLeft, User, MapPin, Package, CreditCard, Truck, Calendar, Save, Printer, RotateCcw } from "lucide-react";

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { orders, orderItems, isLoading, refreshOrders, updateOrderStatus, updateOrderShipping } = useAdminStore();
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Edit states
  const [status, setStatus] = useState<string>("PENDING");
  const [courierName, setCourierName] = useState("");
  const [awb, setAwb] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDispatchingDelhivery, setIsDispatchingDelhivery] = useState(false);
  const [isCancellingDelhivery, setIsCancellingDelhivery] = useState(false);
  const [delhiverySuccessMsg, setDelhiverySuccessMsg] = useState<string | null>(null);

  // Refund state
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundMessage, setRefundMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    refreshOrders().then(() => setIsInitializing(false));
  }, [refreshOrders]);

  const order = orders.find(o => o.id === id);
  const items = orderItems.filter(i => i.order_id === id);

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setCourierName(order.courier_name || "");
      setAwb(order.shiprocket_awb || "");
    }
  }, [order]);

  const handleDispatchDelhivery = async () => {
    if (!order) return;
    setIsDispatchingDelhivery(true);
    setDelhiverySuccessMsg(null);
    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch(`/api/admin/orders/${order.id}/delhivery`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCourierName(data.courierName || "Delhivery Express");
        setAwb(data.waybill);
        setDelhiverySuccessMsg(`✓ Dispatched with Delhivery! AWB: ${data.waybill}`);
        await refreshOrders();
      } else {
        alert(data.error || "Failed to dispatch with Delhivery");
      }
    } catch {
      alert("Failed to connect to Delhivery dispatch service");
    } finally {
      setIsDispatchingDelhivery(false);
    }
  };

  const handleCancelDelhivery = async () => {
    if (!order || !order.shiprocket_awb) return;
    if (!confirm(`Are you sure you want to cancel Delhivery shipment AWB ${order.shiprocket_awb}?`)) return;

    setIsCancellingDelhivery(true);
    setDelhiverySuccessMsg(null);
    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch(`/api/admin/orders/${order.id}/delhivery/cancel`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCourierName("");
        setAwb("");
        setDelhiverySuccessMsg("✓ Delhivery shipment was cancelled successfully.");
        await refreshOrders();
      } else {
        alert(data.error || "Failed to cancel Delhivery shipment");
      }
    } catch {
      alert("Failed to connect to Delhivery cancel service");
    } finally {
      setIsCancellingDelhivery(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!order) return;
    setIsSaving(true);
    try {
      await updateOrderStatus(id, status as any);
      alert("Status updated");
    } catch (e) {
      alert("Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateShipping = async () => {
    if (!order) return;
    setIsSaving(true);
    try {
      await updateOrderShipping(id, courierName, awb);
      alert("Shipping details updated");
    } catch (e) {
      alert("Failed to update shipping details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefund = async () => {
    if (!order) return;
    const amountPaise = Math.round(parseFloat(refundAmount) * 100);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      setRefundMessage({ type: "error", text: "Please enter a valid refund amount" });
      return;
    }
    if (amountPaise > order.total) {
      setRefundMessage({ type: "error", text: `Amount cannot exceed ₹${(order.total / 100).toFixed(2)}` });
      return;
    }

    setIsRefunding(true);
    setRefundMessage(null);
    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amountPaise,
          note: refundNote || "Admin-initiated refund",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRefundMessage({ type: "success", text: `✓ Refund processed (${data.status}). Refund ID: ${data.refundId}` });
        setShowRefundForm(false);
        setRefundAmount("");
        setRefundNote("");
        await refreshOrders();
      } else {
        setRefundMessage({ type: "error", text: data.error || "Refund failed" });
      }
    } catch {
      setRefundMessage({ type: "error", text: "Failed to process refund" });
    } finally {
      setIsRefunding(false);
    }
  };

  if (isInitializing) {
    return <div className="flex h-screen items-center justify-center bg-[#F4F5F7]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent"></div></div>;
  }

  if (!order) {
    return <div className="p-8 text-center text-slate-500">Order not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders" className="rounded-lg p-2 text-slate-500 hover:bg-slate-200">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Order #{order.order_number}</h1>
            <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(order.created_at).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <Link
          href={`/admin/orders/${order.id}/kot`}
          target="_blank"
          className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
        >
          <Printer className="h-4 w-4" />
          <span>Download / Print KOT</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Qty</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{item.product_name}</div>
                        {item.variant_name && item.variant_name !== "Default" && (
                          <div className="text-xs text-slate-500">Variant: {item.variant_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">₹{(item.unit_price / 100).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        ₹{(item.line_total / 100).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 flex flex-col items-end space-y-2">
              <div className="flex justify-between w-64 text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">₹{(order.subtotal / 100).toLocaleString("en-IN")}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between w-64 text-sm text-green-600">
                  <span>Discount</span>
                  <span>-₹{(order.discount / 100).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between w-64 text-lg font-bold border-t border-slate-100 pt-2">
                <span>Total</span>
                <span>₹{(order.total / 100).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
          
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping &amp; Logistics
              </h2>
              {order.shiprocket_awb && (
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                  AWB: {order.shiprocket_awb}
                </span>
              )}
            </div>

            {/* Delhivery Express 1-Click Dispatch Card */}
            <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="h-4 w-4" />
                  <span>Delhivery.com Express B2C</span>
                </span>
                {order.shiprocket_awb && order.courier_name?.toLowerCase().includes("delhivery") && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Delhivery Active
                  </span>
                )}
              </div>
              
              <p className="text-xs text-gray-600 leading-relaxed">
                Click below to instantly create shipment on Delhivery.com, generate live AWB, and create live tracking link without manual data entry.
              </p>

              {order.shiprocket_awb && (
                <div className="bg-white p-3 rounded-xl border border-red-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-gray-500 font-medium">Courier: </span>
                    <strong className="text-gray-900">{order.courier_name || "Delhivery Express"}</strong>
                  </div>
                  <a
                    href={`https://www.delhivery.com/track/package/${order.shiprocket_awb}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Track on Delhivery.com ({order.shiprocket_awb})</span>
                    <span>↗</span>
                  </a>
                </div>
              )}

              {delhiverySuccessMsg && (
                <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  {delhiverySuccessMsg}
                </p>
              )}

              {order.shiprocket_awb ? (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <a
                    href={`https://www.delhivery.com/track/package/${order.shiprocket_awb}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    <span>Track Live on Delhivery.com</span>
                    <span>↗</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCancelDelhivery}
                    disabled={isCancellingDelhivery}
                    className="px-4 py-3 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isCancellingDelhivery ? "Cancelling..." : "Cancel Shipment"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  {(order.payment_status === "PAID" || order.status === "PAID") && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
                      ⚡ Payment Confirmed: Ready for automatic / 1-click Delhivery dispatch.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleDispatchDelhivery}
                    disabled={isDispatchingDelhivery}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Truck className="h-4 w-4" />
                    <span>{isDispatchingDelhivery ? "Connecting to Delhivery.com..." : "Dispatch with Delhivery Express (Generate AWB)"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Manual Shipping Override */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Manual Courier Override</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Courier Name</label>
                  <input type="text" value={courierName} onChange={e => setCourierName(e.target.value)} className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-blue-500" placeholder="e.g. Delhivery Express" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">AWB / Tracking No.</label>
                  <input type="text" value={awb} onChange={e => setAwb(e.target.value)} className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-blue-500" placeholder="Tracking Number" />
                </div>
              </div>
              <button onClick={handleUpdateShipping} disabled={isSaving} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black disabled:opacity-50 transition-colors">
                Update Shipping Info
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Order Status</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 font-medium">
                  <option value="PENDING">PENDING</option>
                  <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                  <option value="PAYMENT_FAILED">PAYMENT_FAILED</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <button onClick={handleUpdateStatus} disabled={isSaving || status === order.status} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="h-4 w-4" /> Save Status
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-slate-400" />
              Customer Details
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-slate-500 text-xs">Name</div>
                <div className="font-medium text-slate-900">{order.customer_name || "Guest"}</div>
              </div>
              {order.customer_phone && (
                <div>
                  <div className="text-slate-500 text-xs">Phone</div>
                  <div className="font-medium text-slate-900">{order.customer_phone}</div>
                </div>
              )}
              {order.customer_email && (
                <div>
                  <div className="text-slate-500 text-xs">Email</div>
                  <div className="font-medium text-slate-900">{order.customer_email}</div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-slate-400" />
              Payment Details
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-slate-500 text-xs">Payment Mode</div>
                <div className="font-medium text-slate-900">{order.payment_mode || "N/A"}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">Payment Status</div>
                <div className="mt-1">
                  {order.payment_status === "PAID" ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ PAID
                    </span>
                  ) : order.payment_status === "FAILED" || order.status === "PAYMENT_FAILED" ? (
                    <div className="space-y-1.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                        ✕ PAYMENT FAILED
                      </span>
                      <p className="text-[11px] text-red-600 font-medium">
                        Customer payment attempt was declined or failed at gateway.
                      </p>
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      {order.payment_status || "PENDING"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Refund Section */}
            {order.payment_status === "PAID" && order.channel !== "OFFLINE" && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                {refundMessage && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${
                    refundMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {refundMessage.text}
                  </div>
                )}

                {!showRefundForm ? (
                  <button
                    onClick={() => {
                      setShowRefundForm(true);
                      setRefundAmount((order.total / 100).toFixed(2));
                      setRefundNote("");
                      setRefundMessage(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Process Refund</span>
                  </button>
                ) : (
                  <div className="space-y-3 bg-amber-50/50 rounded-xl p-4 border border-amber-200">
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Process Refund (Razorpay)</h3>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Refund Amount (₹) — max ₹{(order.total / 100).toFixed(2)}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={(order.total / 100).toFixed(2)}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-amber-500"
                        placeholder="Amount in rupees"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Reason (optional)</label>
                      <input
                        type="text"
                        value={refundNote}
                        onChange={(e) => setRefundNote(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-amber-500"
                        placeholder="e.g. Customer requested cancellation"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRefund}
                        disabled={isRefunding}
                        className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-colors"
                      >
                        {isRefunding ? "Processing..." : "Confirm Refund"}
                      </button>
                      <button
                        onClick={() => { setShowRefundForm(false); setRefundMessage(null); }}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {order.shipping_address && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-slate-400" />
                Shipping Address
              </h2>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">
                {typeof order.shipping_address === 'string' 
                  ? order.shipping_address 
                  : JSON.stringify(order.shipping_address, null, 2)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
