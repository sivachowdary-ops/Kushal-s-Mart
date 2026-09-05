export default function CategoriesLoading() {
  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200/80 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-3.5 w-12 bg-gray-200 rounded-md" />
            <div className="h-3 w-3 bg-gray-200 rounded-full" />
            <div className="h-3.5 w-24 bg-gray-200 rounded-md" />
          </div>
          <div className="h-4 w-28 bg-red-100 rounded-md mb-2" />
          <div className="h-9 w-64 bg-gray-200 rounded-xl mb-2" />
          <div className="h-4 w-80 bg-gray-100 rounded-md" />
        </div>
      </div>

      {/* Categories Grid Skeleton */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs flex flex-col items-center space-y-4"
            >
              <div className="h-36 w-36 bg-gray-100 rounded-2xl" />
              <div className="h-5 w-40 bg-gray-200 rounded-md" />
              <div className="h-4 w-24 bg-gray-100 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
