"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";
import {
  Store,
  Database,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  KeyRound,
  Mail,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  UserCheck,
  RefreshCw,
} from "lucide-react";

interface PosStaffUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export default function SettingsPage() {
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "error">("checking");

  // Admin Password Change State
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState<string>("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState<string>("");
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // POS Staff State
  const [posStaffUsers, setPosStaffUsers] = useState<PosStaffUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState<boolean>(true);
  const [newStaffName, setNewStaffName] = useState<string>("");
  const [newStaffEmail, setNewStaffEmail] = useState<string>("");
  const [newStaffPassword, setNewStaffPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState<boolean>(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Check DB Health
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/admin/health");
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setDbStatus("connected");
            return;
          }
        }
        setDbStatus("error");
      } catch {
        setDbStatus("error");
      }
    }
    checkHealth();
  }, []);

  // Fetch POS Staff Accounts
  const fetchPosStaff = useCallback(async () => {
    setIsLoadingStaff(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/pos-users", { headers });
      if (res.ok) {
        const data = await res.json();
        setPosStaffUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch POS staff:", err);
    } finally {
      setIsLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    fetchPosStaff();
  }, [fetchPosStaff]);

  // Fetch current logged in admin email
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setCurrentUserEmail(data.user.email);
      }
    });
  }, []);

  // Handle Admin Password Change
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newAdminPassword) {
      setPasswordError("Please enter a new password.");
      return;
    }

    if (newAdminPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    if (newAdminPassword !== confirmAdminPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newAdminPassword,
      });

      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess("Admin password updated successfully! Use your new password for your next login.");
        setNewAdminPassword("");
        setConfirmAdminPassword("");
      }
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Add Staff
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    setStaffSuccess(null);

    if (!newStaffEmail || !newStaffPassword) {
      setStaffError("Email and password are required.");
      return;
    }

    if (newStaffPassword.length < 6) {
      setStaffError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmittingStaff(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/pos-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          name: newStaffName.trim() || "Store Cashier",
          email: newStaffEmail.trim(),
          password: newStaffPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStaffError(data.error || "Failed to create staff account.");
      } else {
        setStaffSuccess(`Account created for ${newStaffEmail}! They can now log in at /pos.`);
        setNewStaffName("");
        setNewStaffEmail("");
        setNewStaffPassword("");
        fetchPosStaff();
        setTimeout(() => setStaffSuccess(null), 5000);
      }
    } catch {
      setStaffError("Network error while creating account.");
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // Handle Delete Staff
  const handleDeleteStaff = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke POS access for ${email}? They will no longer be able to log in to the POS register.`)) {
      return;
    }

    setDeletingId(userId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/pos-users?id=${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers,
      });

      if (res.ok) {
        setPosStaffUsers((prev) => prev.filter((u) => u.id !== userId));
        setStaffSuccess(`Access revoked for ${email}.`);
        setTimeout(() => setStaffSuccess(null), 4000);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete staff account.");
      }
    } catch {
      alert("Network error while revoking account.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 bg-[#F4F5F7] min-h-screen p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">System Settings</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
          Manage store settings, POS cashier credentials, and system status.
        </p>
      </div>

      {/* Admin Password & Account Security Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <h2 className="text-xl font-black flex items-center gap-2 text-slate-900">
              <KeyRound className="h-5 w-5 text-red-600" />
              Admin Password &amp; Security
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              Change the password for the store administrator account. All updates are cryptographically hashed and secured in Supabase Auth.
            </p>
          </div>
          {currentUserEmail && (
            <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-full text-xs font-bold self-start sm:self-auto">
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span>Admin: {currentUserEmail}</span>
            </div>
          )}
        </div>

        {passwordError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs font-bold text-red-600 flex items-center gap-2 max-w-xl">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-bold text-emerald-700 flex items-center gap-2 max-w-xl">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <form onSubmit={handleChangeAdminPassword} className="max-w-xl space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              <Lock className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
              New Admin Password *
            </label>
            <div className="relative">
              <input
                type={showAdminPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Enter new password (minimum 6 characters)"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 pr-10 text-xs text-slate-900 font-semibold focus:border-red-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title={showAdminPassword ? "Hide password" : "Show password"}
              >
                {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              <ShieldCheck className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
              Confirm New Password *
            </label>
            <input
              type={showAdminPassword ? "text" : "password"}
              required
              minLength={6}
              placeholder="Re-enter new password"
              value={confirmAdminPassword}
              onChange={(e) => setConfirmAdminPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 font-semibold focus:border-red-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-extrabold text-xs uppercase tracking-wider px-6 py-3.5 shadow-md shadow-red-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isUpdatingPassword ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                <span>Save New Password</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* POS Cashier & Staff Accounts — Full Width Featured Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <h2 className="text-xl font-black flex items-center gap-2 text-slate-900">
              <UserCheck className="h-5 w-5 text-red-600" />
              Store POS Cashier &amp; Staff Accounts
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              Create and manage staff login credentials for the POS register (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-slate-800">/pos</code>).
              Only registered staff and administrators can unlock and operate the register.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchPosStaff()}
            disabled={isLoadingStaff}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStaff ? "animate-spin" : ""}`} />
            <span>Refresh Staff List</span>
          </button>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
          {/* Left Form: Add New Staff Account */}
          <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Plus className="h-4 w-4 text-red-600 stroke-[3]" />
              <span>Add New POS Cashier</span>
            </div>

            {staffError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{staffError}</span>
              </div>
            )}

            {staffSuccess && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{staffSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  <User className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
                  Staff / Cashier Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arjun (Kochi Counter)"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 font-semibold focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  <Mail className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
                  Staff Login Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. cashier1@kushalsmart.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 font-semibold focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  <KeyRound className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
                  Staff Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 pr-10 text-xs text-slate-900 font-semibold focus:border-red-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Hand this email &amp; password to your employee for logging into the store POS.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmittingStaff}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-extrabold text-xs uppercase tracking-wider py-3 shadow-md shadow-red-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingStaff ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 stroke-[3]" />
                    <span>Create POS Staff Account</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Table: Active POS Staff Accounts */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Active Staff Accounts ({posStaffUsers.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Authorized for POS Terminal
              </span>
            </div>

            {isLoadingStaff ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-xs font-semibold gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
                <span>Loading cashier accounts...</span>
              </div>
            ) : posStaffUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2 bg-slate-50/50">
                <Lock className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="font-bold text-xs text-slate-700">No POS Staff Accounts Yet</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Add store employees using the form on the left. Once created, they can log into the POS register using their credentials.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Cashier / Staff</th>
                      <th className="px-4 py-3">Login Email</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                    {posStaffUsers.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[140px]">{staff.name}</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                          {staff.email}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(staff.id, staff.email)}
                            disabled={deletingId === staff.id}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition disabled:opacity-50 cursor-pointer"
                            title="Revoke access"
                          >
                            {deletingId === staff.id ? (
                              <div className="h-3 w-3 animate-spin rounded-full border border-red-600 border-t-transparent" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            <span>Revoke</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Status & Company Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Company Details */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
            <Store className="h-5 w-5 text-blue-600" />
            Company Details
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company / Brand Name</label>
              <input
                disabled
                type="text"
                value="Kushal's Mart (RC &amp; Diecast Superstore)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Central GSTIN</label>
              <input
                disabled
                type="text"
                value="37BAOPJ6159C2ZH"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600 font-medium font-mono"
              />
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
            <Database className="h-5 w-5 text-blue-600" />
            System Status
          </h2>

          <div className="flex items-center justify-between p-3.5 border border-slate-100 rounded-2xl bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-blue-600">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900">Primary Database</div>
                <div className="text-[11px] text-slate-500">PostgreSQL Data Store</div>
              </div>
            </div>

            {dbStatus === "checking" && <div className="text-slate-500 text-xs font-bold">Checking...</div>}
            {dbStatus === "connected" && (
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connected
              </div>
            )}
            {dbStatus === "error" && (
              <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold bg-red-50 px-3 py-1 rounded-full border border-red-200">
                <AlertCircle className="h-3.5 w-3.5" />
                Disconnected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
