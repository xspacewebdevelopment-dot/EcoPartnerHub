"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "reset" | "success">("request");

  // Step 1: Request
  const [email, setEmail] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Step 2: Reset
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Quick fill helper
  const handleSelectEmail = (selectedEmail: string) => {
    setEmail(selectedEmail);
    setRequestError(null);
  };

  // Step 1 Submit
  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestLoading(true);
    setRequestError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setRequestError(data.error || "Failed to process password reset request.");
      } else {
        if (data.resetToken) {
          setResetToken(data.resetToken);
        }
        setStep("reset");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setRequestError(msg);
    } finally {
      setRequestLoading(false);
    }
  };

  // Step 2 Submit
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);

    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match. Please re-enter both passwords.");
      setResetLoading(false);
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
        setResetError(data.error || "Failed to reset password. Please verify your token.");
      } else {
        setStep("success");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  const copyTokenToClipboard = () => {
    if (resetToken) {
      navigator.clipboard.writeText(resetToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  // Password criteria check
  const hasLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSpecial = /[@$!%*?&#]/.test(newPassword);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-8">
        {/* Header */}
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
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Remembered your credentials?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-600 hover:text-emerald-500 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>

        {/* Step Navigation Pill */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStep("request")}
            className={`flex-1 py-2 text-center rounded-lg transition ${
              step === "request"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            1. Request Token
          </button>
          <button
            type="button"
            onClick={() => setStep("reset")}
            className={`flex-1 py-2 text-center rounded-lg transition ${
              step === "reset"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            2. Set New Password
          </button>
        </div>

        {/* STEP 1: REQUEST TOKEN */}
        {step === "request" && (
          <div className="space-y-6">
            {/* Quick Demo Accounts Selection */}
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 shadow-xs">
              <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Select a Demo Account to Reset
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectEmail("customer@ecopartnerhub.com")}
                  className={`text-left p-2 rounded-lg bg-white border transition ${
                    email === "customer@ecopartnerhub.com"
                      ? "border-emerald-600 ring-1 ring-emerald-500"
                      : "border-slate-200 hover:border-emerald-500"
                  }`}
                >
                  <div className="font-semibold text-slate-800">Customer</div>
                  <div className="text-slate-500 truncate text-[11px]">customer@ecopartnerhub.com</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectEmail("provider@ecopartnerhub.com")}
                  className={`text-left p-2 rounded-lg bg-white border transition ${
                    email === "provider@ecopartnerhub.com"
                      ? "border-emerald-600 ring-1 ring-emerald-500"
                      : "border-slate-200 hover:border-emerald-500"
                  }`}
                >
                  <div className="font-semibold text-slate-800">Provider</div>
                  <div className="text-slate-500 truncate text-[11px]">provider@ecopartnerhub.com</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectEmail("admin@ecopartnerhub.com")}
                  className={`text-left p-2 rounded-lg bg-white border transition ${
                    email === "admin@ecopartnerhub.com"
                      ? "border-emerald-600 ring-1 ring-emerald-500"
                      : "border-slate-200 hover:border-emerald-500"
                  }`}
                >
                  <div className="font-semibold text-slate-800">Admin</div>
                  <div className="text-slate-500 truncate text-[11px]">admin@ecopartnerhub.com</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectEmail("superadmin@ecopartnerhub.com")}
                  className={`text-left p-2 rounded-lg bg-white border transition ${
                    email === "superadmin@ecopartnerhub.com"
                      ? "border-emerald-600 ring-1 ring-emerald-500"
                      : "border-slate-200 hover:border-emerald-500"
                  }`}
                >
                  <div className="font-semibold text-slate-800">Super Admin</div>
                  <div className="text-slate-500 truncate text-[11px]">superadmin@ecopartnerhub.com</div>
                </button>
              </div>
            </div>

            {/* Error message */}
            {requestError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <p className="text-sm font-medium text-red-800">{requestError}</p>
              </div>
            )}

            {/* Request Card */}
            <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200/80 sm:px-10">
              <form className="space-y-6" onSubmit={handleRequestToken}>
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">
                    Account Email Address
                  </label>
                  <div className="mt-1">
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                      placeholder="e.g. customer@ecopartnerhub.com"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    We will generate a secure one-time cryptographic reset token valid for 1 hour.
                  </p>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={requestLoading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition"
                  >
                    {requestLoading ? "Generating token..." : "Generate Reset Token →"}
                  </button>
                </div>

                <div className="text-center text-xs text-slate-500">
                  Already have a reset token?{" "}
                  <button
                    type="button"
                    onClick={() => setStep("reset")}
                    className="text-emerald-600 font-semibold hover:underline"
                  >
                    Enter Token Directly
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STEP 2: RESET PASSWORD */}
        {step === "reset" && (
          <div className="space-y-6">
            {/* Token Info Banner if generated */}
            {resetToken && (
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                    Generated Reset Token (Dev & Testing)
                  </span>
                  <button
                    type="button"
                    onClick={copyTokenToClipboard}
                    className="text-xs px-2 py-1 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
                  >
                    {tokenCopied ? "Copied!" : "Copy Token"}
                  </button>
                </div>
                <div className="p-2 bg-white rounded border border-emerald-200 font-mono text-[11px] text-slate-700 break-all select-all">
                  {resetToken}
                </div>
                <p className="text-[11px] text-emerald-800">
                  ✓ Token has been automatically populated in the field below. Valid for 1 hour.
                </p>
              </div>
            )}

            {/* Error message */}
            {resetError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <p className="text-sm font-medium text-red-800">{resetError}</p>
              </div>
            )}

            {/* Reset Form Card */}
            <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200/80 sm:px-10">
              <form className="space-y-5" onSubmit={handleResetPassword}>
                <div>
                  <label htmlFor="token-input" className="block text-sm font-medium text-slate-700">
                    Reset Token
                  </label>
                  <div className="mt-1">
                    <input
                      id="token-input"
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="font-mono text-xs appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Paste 64-character hex token"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
                    New Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="new-password"
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
                  <div className="font-semibold text-slate-700 mb-1">Password Requirements:</div>
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
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
                    Confirm New Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirm-password"
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
                    disabled={resetLoading || !resetToken || !newPassword}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition"
                  >
                    {resetLoading ? "Updating Password..." : "Update Password & Invalidate Sessions"}
                  </button>
                </div>

                <div className="text-center text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => setStep("request")}
                    className="text-slate-600 hover:text-emerald-600 font-medium"
                  >
                    ← Need to request a different token?
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === "success" && (
          <div className="bg-white py-10 px-6 shadow-md rounded-2xl border border-emerald-200/90 sm:px-10 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
              ✓
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Password Reset Successfully!
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Your password has been securely updated and all previous active sessions have been invalidated across devices.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition"
              >
                Sign In With Your New Password →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 mt-6">
        EcoPartnerHub &copy; 2026. Protected by Role-Based Access Control (RBAC) & Next.js 16.
      </div>
    </div>
  );
}
