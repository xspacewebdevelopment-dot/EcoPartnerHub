"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    token: string;
    user: {
      id: string;
      email: string;
      role: string;
      accountStatus: string;
    };
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessData(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Login failed. Please check your credentials.");
      } else {
        setSuccessData(data);
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userRole", data.user.role);
        localStorage.setItem("userEmail", data.user.email);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

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
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Or{" "}
            <Link
              href="/register"
              className="font-medium text-emerald-600 hover:text-emerald-500 hover:underline"
            >
              create a new Customer or Provider account
            </Link>
          </p>
        </div>

        {/* Quick Demo Accounts Selection */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Demo Credentials (Week 1 SeedTest Data)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillCredentials("customer@ecopartnerhub.com", "Customer@2026")}
              className="text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition"
            >
              <div className="font-semibold text-slate-800">Customer</div>
              <div className="text-slate-500 truncate text-[11px]">customer@ecopartnerhub.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials("provider@ecopartnerhub.com", "Provider@2026")}
              className="text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition"
            >
              <div className="font-semibold text-slate-800">Provider</div>
              <div className="text-slate-500 truncate text-[11px]">provider@ecopartnerhub.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials("admin@ecopartnerhub.com", "AdminUser@2026")}
              className="text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition"
            >
              <div className="font-semibold text-slate-800">Operations Admin</div>
              <div className="text-slate-500 truncate text-[11px]">admin@ecopartnerhub.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials("superadmin@ecopartnerhub.com", "SuperAdmin@2026")}
              className="text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition"
            >
              <div className="font-semibold text-slate-800">Super Admin</div>
              <div className="text-slate-500 truncate text-[11px]">superadmin@ecopartnerhub.com</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex">
              <div className="ml-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successData && (
          <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">✓</span>
                <span className="font-bold text-emerald-900 text-sm">Authentication Successful</span>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-200 text-emerald-800">
                {successData.user.role}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Logged in as <strong className="text-slate-800">{successData.user.email}</strong>. Active JWT session generated.
            </p>
            <div className="flex gap-2 pt-1">
              <Link
                href="/dashboard"
                className="w-full inline-flex justify-center py-2 px-3 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs"
              >
                Go to Role Dashboard →
              </Link>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200/80 sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-slate-700"
                >
                  Remember session
                </label>
              </div>

              <div className="text-slate-500 hover:text-emerald-600 cursor-pointer">
                Forgot password?
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition"
              >
                {loading ? "Authenticating..." : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 mt-6">
        EcoPartnerHub &copy; 2026. Protected by Role-Based Access Control (RBAC) & Next.js 16.
      </div>
    </div>
  );
}
