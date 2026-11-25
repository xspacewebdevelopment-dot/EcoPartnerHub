"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState<{
    endpoint: string;
    status: number;
    data: unknown;
  } | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    if (!savedToken) {
      router.push("/login");
      return;
    }

    const initAuth = async () => {
      setToken(savedToken);
      setUserRole(localStorage.getItem("userRole"));
      setUserEmail(localStorage.getItem("userEmail"));

      try {
        const res = await fetch("/api/user/me", {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        const d = await res.json();
        if (d.success) {
          setUserInfo(d.user);
        }
      } catch {}
    };

    void initAuth();
  }, [router]);

  const testEndpoint = async (endpoint: string) => {
    if (!token) return;
    setLoading(true);
    setApiResult(null);

    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApiResult({
        endpoint,
        status: res.status,
        data,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error contacting endpoint";
      setApiResult({
        endpoint,
        status: 500,
        data: { error: message },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!token) return;
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}

    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
                E
              </span>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                EcoPartnerHub
              </span>
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold uppercase tracking-wider">
              {userRole || "Authenticating..."}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 hidden sm:inline">
              Logged in: <strong className="text-slate-800">{userEmail}</strong>
            </span>
            <Link
              href="/verify"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
            >
              Verify Email / Phone
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
            >
              Sign out / Revoke Token
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Role-Based Access Control (RBAC) Test Console
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Verify Week 1 authorization guards across CUSTOMER, PROVIDER, ADMIN, and SUPER_ADMIN endpoints.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/verify"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <span className={userInfo?.isEmailVerified ? "text-emerald-600 font-bold" : "text-amber-600"}>
                {userInfo?.isEmailVerified ? "✓ Email Verified" : "⚠ Email Unverified"}
              </span>
              <span>•</span>
              <span className={userInfo?.isPhoneVerified ? "text-emerald-600 font-bold" : "text-amber-600"}>
                {userInfo?.isPhoneVerified ? "✓ Phone Verified" : "⚠ Phone Unverified"}
              </span>
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              JWT Active & Verified
            </span>
          </div>
        </div>

        {/* Quick RBAC Endpoint Probing */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>🛡️</span> Test Role Protected Endpoints
          </h2>
          <p className="text-xs text-slate-600">
            Click any button below to execute an authenticated request with your current bearer token. Observe the resulting HTTP status code (200 OK vs 403 Forbidden).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => testEndpoint("/api/customer/dashboard")}
              disabled={loading}
              className="p-3 text-left rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition group"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                Customer Dashboard
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">/api/customer/dashboard</div>
              <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                CUSTOMER Only
              </span>
            </button>

            <button
              onClick={() => testEndpoint("/api/provider/dashboard")}
              disabled={loading}
              className="p-3 text-left rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition group"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                Provider Dashboard
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">/api/provider/dashboard</div>
              <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                PROVIDER Only
              </span>
            </button>

            <button
              onClick={() => testEndpoint("/api/admin/dashboard")}
              disabled={loading}
              className="p-3 text-left rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/30 transition group"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700">
                Operations Admin
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">/api/admin/dashboard</div>
              <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                ADMIN & SUPER_ADMIN
              </span>
            </button>

            <button
              onClick={() => testEndpoint("/api/super-admin/dashboard")}
              disabled={loading}
              className="p-3 text-left rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/30 transition group"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                Super Admin Console
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">/api/super-admin/dashboard</div>
              <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-medium">
                SUPER_ADMIN Only
              </span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
            <button
              onClick={() => testEndpoint("/api/user/me")}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              Probe GET /api/user/me
            </button>
            <button
              onClick={() => testEndpoint("/api/user/status")}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              Probe GET /api/user/status
            </button>
            <button
              onClick={() => testEndpoint("/api/health/db")}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              Probe GET /api/health/db
            </button>
          </div>
        </div>

        {/* API Response Inspector */}
        {apiResult && (
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-md space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Response for:</span>
                <span className="text-emerald-400 font-bold">{apiResult.endpoint}</span>
              </div>
              <div>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    apiResult.status >= 200 && apiResult.status < 300
                      ? "bg-emerald-900/80 text-emerald-300 border border-emerald-700"
                      : apiResult.status === 403
                      ? "bg-amber-900/80 text-amber-300 border border-amber-700"
                      : "bg-rose-900/80 text-rose-300 border border-rose-700"
                  }`}
                >
                  HTTP {apiResult.status}
                </span>
              </div>
            </div>
            <pre className="overflow-x-auto p-2 bg-slate-950/70 rounded-lg max-h-72">
              {JSON.stringify(apiResult.data, null, 2)}
            </pre>
          </div>
        )}

        {/* User Identity Details Card */}
        {userInfo && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Current Identity & Profile Records
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">User ID</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {String(userInfo.id)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Account Status</span>
                <span className="font-semibold text-emerald-700">
                  {String(userInfo.accountStatus)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Registered Email</span>
                <span className="font-semibold text-slate-900">
                  {String(userInfo.email)}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
