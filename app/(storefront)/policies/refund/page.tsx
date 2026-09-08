export default function RefundPolicyPage() {
  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16">
      <div className="bg-white border-b border-gray-200/80 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-extrabold text-3xl sm:text-4xl text-gray-900 tracking-tight">
            Refund & Return Policy
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-sm space-y-6 text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
          <h2 className="font-extrabold text-lg text-gray-900 border-b border-gray-100 pb-2">1. Transit Damage & Manufacturing Defect Guarantee</h2>
          <p>We take extreme care in packing delicate RC electronics and scale models. If your item arrives damaged in transit or with a manufacturing defect, contact us within 48 hours of delivery for a free replacement.</p>

          <h2 className="font-extrabold text-lg text-gray-900 border-b border-gray-100 pb-2">2. Unboxing Video Requirement</h2>
          <p>To claim transit damage or missing items, an unedited 360-degree unboxing video recorded while opening the outer parcel seal is mandatory.</p>

          <h2 className="font-extrabold text-lg text-gray-900 border-b border-gray-100 pb-2">3. Refund Process</h2>
          <p>Approved refunds are processed back to your original payment method (UPI / Bank Account) within 5-7 business days.</p>
        </div>
      </div>
    </div>
  );
}
