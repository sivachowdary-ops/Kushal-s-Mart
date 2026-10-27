"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { AlertCircle, CheckCircle2, ShieldCheck, Smartphone, Trash2 } from "lucide-react";

interface PendingEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

/**
 * Admin two-factor authentication via Supabase Auth MFA (TOTP).
 * Once every admin is enrolled, set ADMIN_REQUIRE_MFA=true in Vercel so the
 * admin APIs reject password-only sessions.
 */
export function MfaSettings() {
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pending, setPending] = useState<PendingEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadFactors = useCallback(async () => {
    const { data, error: listErr } = await supabase.auth.mfa.listFactors();
    if (listErr) {
      setError(listErr.message);
    } else {
      setVerifiedFactorId(data.totp[0]?.id ?? null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.mfa.listFactors().then(({ data, error: listErr }) => {
      if (cancelled) return;
      if (listErr) setError(listErr.message);
      else setVerifiedFactorId(data.totp[0]?.id ?? null);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const startEnrollment = async () => {
    setError(null);
    setSuccess(null);
    setIsBusy(true);
    try {
      // Remove abandoned, never-verified factors so enrollment can be restarted
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const factor of existing?.all || []) {
        if (factor.factor_type === "totp" && factor.status !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Kushal's Mart Admin ${new Date().toISOString().slice(0, 10)}`,
      });
      if (enrollErr) throw enrollErr;
      setPending({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start 2FA enrollment.");
    } finally {
      setIsBusy(false);
    }
  };

  const confirmEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    setError(null);
    setIsBusy(true);
    try {
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: pending.factorId,
        code: code.trim(),
      });
      if (verifyErr) throw verifyErr;
      setPending(null);
      setCode("");
      setSuccess("Two-factor authentication is on. You'll be asked for a code at every admin login.");
      await loadFactors();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const removeFactor = async () => {
    if (!verifiedFactorId) return;
    if (!confirm("Turn off two-factor authentication for this admin account?")) return;
    setError(null);
    setSuccess(null);
    setIsBusy(true);
    const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactorId });
    setIsBusy(false);
    if (unenrollErr) {
      setError(unenrollErr.message);
      return;
    }
    setSuccess("Two-factor authentication turned off.");
    await loadFactors();
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-5">
      <div className="space-y-1 border-b border-slate-100 pb-5">
        <h2 className="text-xl font-black flex items-center gap-2 text-slate-900">
          <Smartphone className="h-5 w-5 text-red-600" />
          Two-Factor Authentication
        </h2>
        <p className="text-xs text-slate-500 font-medium max-w-2xl">
          Require a 6-digit code from Google Authenticator (or any TOTP app) in addition to your password.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs font-bold text-red-600 flex items-center gap-2 max-w-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-bold text-emerald-700 flex items-center gap-2 max-w-xl">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {isLoading ? (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      ) : verifiedFactorId ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-1.5 rounded-full text-xs font-bold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Enabled</span>
          </div>
          <button
            type="button"
            onClick={removeFactor}
            disabled={isBusy}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Turn off
          </button>
        </div>
      ) : pending ? (
        <form onSubmit={confirmEnrollment} className="max-w-xl space-y-4">
          <ol className="text-xs text-slate-600 font-medium space-y-1 list-decimal list-inside">
            <li>Scan this QR code with Google Authenticator.</li>
            <li>Enter the 6-digit code it shows to finish.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase returns an SVG data URL */}
          <img src={pending.qrCode} alt="2FA QR code" className="h-48 w-48 rounded-xl border border-slate-200 bg-white p-2" />
          <p className="text-[11px] text-slate-500 font-medium">
            Can&apos;t scan? Enter this key manually: <span className="font-mono font-bold text-slate-800 break-all">{pending.secret}</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-40 rounded-xl border border-slate-300 bg-white p-3 text-center font-mono text-lg tracking-widest text-slate-900 focus:border-red-500 focus:outline-none"
          />
          <div>
            <button
              type="submit"
              disabled={isBusy || code.length !== 6}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider px-6 py-3.5 shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify &amp; Enable
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={startEnrollment}
          disabled={isBusy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider px-6 py-3.5 shadow-md transition-all disabled:opacity-50 cursor-pointer"
        >
          <Smartphone className="h-4 w-4" />
          Set Up Two-Factor Authentication
        </button>
      )}
    </div>
  );
}
