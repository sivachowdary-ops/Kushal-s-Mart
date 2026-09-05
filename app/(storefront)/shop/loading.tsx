export default function ShopLoading() {
  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200/80 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-4 w-32 bg-red-100 rounded-md mb-2" />
          <div className="h-9 w-64 bg-gray-200 rounded-xl mb-2" />
          <div className="h-4 w-96 max-w-full bg-gray-100 rounded-md" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-4 w-36 bg-gray-200 rounded-md" />
          <div className="h-8 w-32 bg-gray-200 rounded-full" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="rounded-2xl sm:rounded-[28px] border border-gray-200/80 bg-white p-3 sm:p-5 shadow-xs space-y-3"
            >
              <div className="h-4 w-14 bg-red-100 rounded-full" />
              <div className="h-28 sm:h-44 w-full bg-gray-100 rounded-xl" />
              <div className="h-4 w-3/4 bg-gray-200 rounded-md" />
              <div className="h-6 w-1/2 bg-gray-200 rounded-md" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="h-9 bg-gray-200 rounded-xl" />
                <div className="h-9 bg-gray-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
