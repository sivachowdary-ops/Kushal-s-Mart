export default function ShippingPolicyPage() {
  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16">
      <div className="bg-white border-b border-gray-200/80 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-extrabold text-3xl sm:text-4xl text-gray-900 tracking-tight">
            Shipping & Delivery Policy
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-sm space-y-6 text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
          <h2 className="font-extrabold text-lg text-gray-900 border-b border-gray-100 pb-2">1. Free Shipping Nationwide</h2>
          <p>Kushal&apos;s Mart offers FREE express shipping on all orders delivered across India. No minimum order quantity or value required.</p>

          <h2 className="font-extrabold text-lg text-gray-900 border-b border-gray-100 pb-2">2. Processing & Dispatch Time</h2>
          <p>All orders placed before 2:00 PM IST are processed and dispatched on the same business day. Orders placed after 2:00 PM IST or on Sundays/Public Holidays will be dispatched on the next business day.</p>

          <h2 className="font-extrabold text-lg text-gray-900 border-b border-gray-100 pb-2">3. Delivery Timeline</h2>
          <p>Estimated delivery timelines across India:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Metro Cities & Major Hubs: 2 – 4 Business Days</li>
            <li>Rest of India & Tier-2/3 Cities: 3 – 6 Business Days</li>
          </ul>

          <h2 className="font-extrabold text-lg text-gray-900 border-b border-gray-100 pb-2">4. Order Tracking</h2>
          <p>Once dispatched, you will receive an AWB tracking number via SMS/Email. You can track your shipment anytime on our <a href="/track-order" className="text-red-600 font-bold hover:underline">Track Order</a> page.</p>
        </div>
      </div>
    </div>
  );
}
