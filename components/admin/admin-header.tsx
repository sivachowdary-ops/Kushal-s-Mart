"use client";

import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/analytics": "Analytics",
  "/admin/products": "Products",
  "/admin/products/new": "Add Product",
  "/admin/categories": "Categories",
  "/admin/orders": "Orders",
  "/admin/pos": "POS Register",
  "/admin/settings": "Settings",
};

interface AdminHeaderProps {
  userEmail: string | null;
  onLogout: () => void;
  onToggleSidebar?: () => void;
}

export function AdminHeader({ userEmail, onLogout, onToggleSidebar }: AdminHeaderProps) {
  const pathname = usePathname();

  let title = TITLES[pathname] || "Admin Panel";
  if (pathname.startsWith("/admin/products/") && pathname !== "/admin/products/new") {
    title = "Edit Product";
  }
  if (pathname.startsWith("/admin/orders/")) {
    title = "Order Details";
  }

  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";

  return (
    <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-gray-200/80 bg-white/95 backdrop-blur-xs px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h1 className="font-extrabold text-base sm:text-xl text-gray-900 truncate tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {userEmail && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200/60 rounded-full py-1 px-2 sm:px-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white font-black text-xs">
              {initial}
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-gray-700 max-w-[140px] truncate" title={userEmail}>
              {userEmail}
            </span>
          </div>
        )}

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 px-3 py-2 text-xs font-bold transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
