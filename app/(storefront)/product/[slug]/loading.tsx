export default function ProductLoading() {
  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="bg-white border-b border-gray-200/80 py-4 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-12 bg-gray-200 rounded-md" />
            <div className="h-3 w-3 bg-gray-200 rounded-full" />
            <div className="h-3.5 w-14 bg-gray-200 rounded-md" />
            <div className="h-3 w-3 bg-gray-200 rounded-full" />
            <div className="h-3.5 w-28 bg-gray-200 rounded-md" />
          </div>
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Gallery Skeleton */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm space-y-4">
            <div className="aspect-square w-full rounded-2xl bg-gray-100" />
            <div className="flex gap-3">
              <div className="h-20 w-20 rounded-2xl bg-gray-100" />
              <div className="h-20 w-20 rounded-2xl bg-gray-100" />
              <div className="h-20 w-20 rounded-2xl bg-gray-100" />
              <div className="h-20 w-20 rounded-2xl bg-gray-100" />
            </div>
          </div>

          {/* Info Skeleton */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm space-y-5">
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-red-100 rounded-md" />
                <div className="h-6 w-24 bg-emerald-50 rounded-full" />
              </div>
              <div className="h-8 w-3/4 bg-gray-200 rounded-xl" />
              <div className="h-10 w-1/2 bg-gray-200 rounded-xl" />
              <div className="h-12 w-full bg-gray-100 rounded-2xl" />
              <div className="h-12 w-full bg-black/80 rounded-2xl" />
              <div className="h-12 w-full bg-red-600/80 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
