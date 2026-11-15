"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  const [resetToken, setResetToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to reset password. Please check token.");
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Password criteria check
  const hasLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSpecial = /[@$!%*?&#]/.test(newPassword);

  if (success) {
    return (
      <div className="bg-white py-10 px-6 shadow-md rounded-2xl border border-emerald-200/90 sm:px-10 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
          ✓
        </div>
        <div>
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Password Reset Completed!
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Your password has been securely updated. You can now sign in with your new credentials.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition"
          >
            Sign In Now →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200/80 sm:px-10 space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleResetPassword}>
        <div>
          <label htmlFor="token-field" className="block text-sm font-medium text-slate-700">
            6-Digit Verification Code
          </label>
          <div className="mt-1">
            <input
              id="token-field"
              type="text"
              required
              maxLength={6}
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              className="font-mono text-lg tracking-[0.3em] text-center font-bold appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-xs placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="••••••"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Enter the 6-digit code received on your email address.
          </p>
        </div>

        <div>
          <label htmlFor="new-pass-field" className="block text-sm font-medium text-slate-700">
            New Password
          </label>
          <div className="mt-1">
            <input
              id="new-pass-field"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* Password Strength Checklist */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
          <div className="font-semibold text-slate-700 mb-1">Requirements:</div>
          <div className={`flex items-center gap-1.5 ${hasLength ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
            <span>{hasLength ? "✓" : "○"}</span> At least 8 characters
          </div>
          <div className={`flex items-center gap-1.5 ${hasUpper ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
            <span>{hasUpper ? "✓" : "○"}</span> At least one uppercase letter (A-Z)
          </div>
          <div className={`flex items-center gap-1.5 ${hasLower ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
            <span>{hasLower ? "✓" : "○"}</span> At least one lowercase letter (a-z)
          </div>
          <div className={`flex items-center gap-1.5 ${hasDigit ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
            <span>{hasDigit ? "✓" : "○"}</span> At least one number (0-9)
          </div>
          <div className={`flex items-center gap-1.5 ${hasSpecial ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
            <span>{hasSpecial ? "✓" : "○"}</span> At least one special symbol (@$!%*?&#)
          </div>
        </div>

        <div>
          <label htmlFor="confirm-pass-field" className="block text-sm font-medium text-slate-700">
            Confirm New Password
          </label>
          <div className="mt-1">
            <input
              id="confirm-pass-field"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading || !resetToken || !newPassword}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition"
          >
            {loading ? "Resetting Password..." : "Confirm & Set New Password"}
          </button>
        </div>

        <div className="text-center text-xs text-slate-500">
          <Link href="/forgot-password" className="text-emerald-600 hover:underline">
            ← Need to request a token first?
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md">
              E
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              EcoPartnerHub
            </span>
          </Link>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Set your new password
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Or{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-600 hover:text-emerald-500 hover:underline"
            >
              return to sign in
            </Link>
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-sm text-slate-500">Loading reset form...</div>}>
          <ResetPasswordContent />
        </Suspense>
      </div>

      <div className="text-center text-xs text-slate-500 mt-6">
        EcoPartnerHub &copy; 2026. Protected by Role-Based Access Control (RBAC) & Next.js 16.
      </div>
    </div>
  );
}
