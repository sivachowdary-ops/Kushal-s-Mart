"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  TrendingUp,
  Settings,
  Store,
  LogOut,
  FolderTree,
  ExternalLink,
  BarChart3,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/pos", label: "POS Register", icon: Receipt },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminSidebarProps {
  onLogout: () => void;
  userEmail: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({
  onLogout,
  userEmail,
  isOpen = false,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#1A1D29] text-white w-[260px] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Logo & Mobile Close */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-white border border-white/10 shadow-md flex items-center justify-center">
              <Image
                src="/kushal_mart_logo.jpeg"
                alt="Kushal's Mart"
                fill
                sizes="40px"
                className="object-contain"
              />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-[15px] tracking-tight truncate text-white">Kushal&apos;s Mart</h1>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                Admin Portal
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close Sidebar"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-all ${
                  active
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-white" : "text-gray-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-4 space-y-2 border-t border-white/5">
          {/* Quick link to standalone counter terminal */}
          <Link
            href="/pos"
            target="_blank"
            className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-400" />
              <span>Store Terminal (/pos)</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
          </Link>

          {userEmail && (
            <div className="px-2 py-1">
              <p className="text-[11px] text-gray-500 truncate" title={userEmail}>
                {userEmail}
              </p>
            </div>
          )}

          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Log Out</span>
          </button>

          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[13px] font-medium text-white hover:bg-white/10 transition-colors"
          >
            <Store className="h-4 w-4 shrink-0" />
            <span>View Storefront</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

