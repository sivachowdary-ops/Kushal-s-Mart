"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminStoreProvider } from "@/lib/admin-store";
import { supabase } from "@/lib/supabase-client";
import { ShieldCheck, Mail, KeyRound, AlertCircle, ShieldAlert } from "lucide-react";
import { checkAuthLockout, recordFailedAuthAttempt, resetAuthAttempts } from "@/lib/auth-rate-limit";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Rate-limit lockout
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Lockout countdown
  useEffect(() => {
    if (!isLockedOut || lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) { setIsLockedOut(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLockedOut, lockoutSeconds]);

  // Check lockout as user types
  useEffect(() => {
    if (!email) return;
    const status = checkAuthLockout(email);
    setIsLockedOut(status.isLocked);
    setLockoutSeconds(status.remainingSeconds);
  }, [email]);

  // On mount: restore existing Supabase session
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Verify the user is actually an admin
          const verifyRes = await fetch("/api/admin/auth/login", {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (verifyRes.ok) {
            setIsAuthenticated(true);
            setUserEmail(session.user.email ?? null);
          } else {
            // Not an admin — don't grant access
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        console.error("Session restore error:", err);
      } finally {
        setIsLoaded(true);
      }
    }
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email ?? null);
      } else {
        setIsAuthenticated(false);
        setUserEmail(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const lockout = checkAuthLockout(email.trim());
    if (lockout.isLocked) {
      setIsLockedOut(true);
      setLockoutSeconds(lockout.remainingSeconds);
      setError(`Account locked. Wait ${Math.ceil(lockout.remainingSeconds / 60)} min.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        const record = recordFailedAuthAttempt(email.trim());
        if (record.isLocked) {
          setIsLockedOut(true);
          setLockoutSeconds(record.remainingSeconds);
          setError("Too many failed attempts. Account LOCKED for 15 minutes.");
        } else {
          setError(`Invalid credentials. Attempt ${record.failedAttempts} of 5 before lockout.`);
        }
      } else if (data.session && data.user) {
        // Verify user is actually an admin via server-side check
        try {
          const verifyRes = await fetch("/api/admin/auth/login", {
            method: "POST",
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          });
          if (!verifyRes.ok) {
            const errJson = await verifyRes.json().catch(() => ({}));
            // Not an admin — sign out immediately
            await supabase.auth.signOut();
            setError(errJson.error || "Access denied. This account is not authorized for admin access.");
            return;
          }
        } catch {
          await supabase.auth.signOut();
          setError("Could not verify admin access. Please try again.");
          return;
        }
        resetAuthAttempts(email.trim());
        setIsAuthenticated(true);
        setUserEmail(data.user.email ?? null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setUserEmail(null);
    await supabase.auth.signOut();
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0F19]">
        <div className="animate-pulse text-gray-400 font-bold text-sm">Loading Admin...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0F19]">
        <div className="w-full max-w-md mx-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="relative h-16 w-16 mx-auto rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-white flex items-center justify-center">
                <Image
                  src="/kushal_mart_logo.jpeg"
                  alt="Kushal's Mart"
                  fill
                  sizes="64px"
                  className="object-contain"
                  priority
                />
              </div>
              <h1 className="font-extrabold text-2xl text-gray-900 tracking-tight">Kushal&apos;s Mart Admin</h1>
              <p className="text-xs text-gray-500 font-medium">Authorized Personnel Only</p>
            </div>

            {isLockedOut && (
              <div className="rounded-2xl bg-red-100 border-2 border-red-500 p-4 text-xs font-bold text-red-700 flex items-center gap-3">
                <ShieldAlert className="h-6 w-6 shrink-0 text-red-600" />
                <div>
                  <div className="font-black text-sm">SECURITY LOCKOUT</div>
                  <div>
                    Locked after 5 failed attempts. Wait{" "}
                    <span className="font-mono font-black">
                      {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && !isLockedOut && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs font-bold text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  <Mail className="inline h-3.5 w-3.5 mr-1 text-gray-400" />
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  disabled={isLockedOut}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kushalsmart.com"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-xs font-semibold text-gray-900 focus:border-red-500 focus:bg-white focus:outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  <KeyRound className="inline h-3.5 w-3.5 mr-1 text-gray-400" />
                  Password
                </label>
                <input
                  type="password"
                  required
                  disabled={isLockedOut}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-xs font-semibold text-gray-900 focus:border-red-500 focus:bg-white focus:outline-none disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || isLockedOut}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-xs font-black uppercase tracking-wider text-white shadow-xl transition-all hover:bg-red-700 hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="h-5 w-5" />
                <span>{isLockedOut ? "LOCKED" : isSubmitting ? "SIGNING IN..." : "LOGIN TO DASHBOARD"}</span>
              </button>
            </form>

            <div className="pt-2 border-t border-gray-100 text-center">
              <p className="text-[11px] font-semibold text-gray-400">5-Attempt Security Lockout · Session Protected</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminStoreProvider>
      <div className="flex min-h-screen bg-[#F4F5F7]">
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLogout={handleLogout}
          userEmail={userEmail}
        />
        <div className="flex-1 ml-0 lg:ml-[260px] min-w-0 transition-all duration-300 flex flex-col min-h-screen">
          <AdminHeader
            userEmail={userEmail}
            onLogout={handleLogout}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
          <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">{children}</main>
        </div>
      </div>
    </AdminStoreProvider>
  );
}
