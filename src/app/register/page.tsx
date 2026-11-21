"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [role, setRole] = useState<"CUSTOMER" | "PROVIDER">("CUSTOMER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Customer specific
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("E-commerce Retailer");
  const [city, setCity] = useState("Bengaluru");
  const [marketplacePresence, setMarketplacePresence] = useState("Amazon India, Flipkart");

  // Provider specific
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [entityType, setEntityType] = useState("PRIVATE_LIMITED");
  const [operatingLocations, setOperatingLocations] = useState("Bengaluru, Mumbai");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const endpoint =
      role === "CUSTOMER"
        ? "/api/auth/register/customer"
        : "/api/auth/register/provider";

    const payload =
      role === "CUSTOMER"
        ? {
            email,
            password,
            phone: phone || undefined,
            fullName,
            businessName,
            businessType,
            city,
            marketplacePresence: marketplacePresence
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : {
            email,
            password,
            phone: phone || undefined,
            legalName,
            displayName,
            entityType,
            operatingLocations: operatingLocations
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            website: website || undefined,
            bio: bio || undefined,
          };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 409) {
          setError("An account with this email address already exists. Duplicate email registration is not allowed.");
        } else {
          setError(data.error || data.message || "Registration failed. Please check the form fields.");
        }
      } else {
        setSuccess(`Registration successful as ${data.user.role}! Token issued.`);
        if (data.token) {
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("userRole", data.user.role);
          localStorage.setItem("userEmail", data.user.email);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md">
              E
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              EcoPartnerHub
            </span>
          </Link>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Create your account
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-600 hover:text-emerald-500 hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="bg-slate-100 p-1.5 rounded-xl grid grid-cols-2 gap-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setRole("CUSTOMER")}
            className={`py-2.5 rounded-lg transition text-center ${
              role === "CUSTOMER"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Customer Account
            <span className="block text-[11px] font-normal text-slate-500">
              Free discovery & enquiries
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRole("PROVIDER")}
            className={`py-2.5 rounded-lg transition text-center ${
              role === "PROVIDER"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Service Provider
            <span className="block text-[11px] font-normal text-slate-500">
              Verified logistics & services
            </span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-red-800">{error}</p>
            {(error.includes("already exists") || error.includes("Duplicate email")) && (
              <Link
                href="/login"
                className="shrink-0 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition"
              >
                Sign in now →
              </Link>
            )}
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">✓</span>
              <span className="font-bold text-emerald-900 text-sm">{success}</span>
            </div>
            <div className="flex gap-2">
              <Link
                href="/dashboard"
                className="w-full inline-flex justify-center py-2 px-3 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs"
              >
                Access Dashboard →
              </Link>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200/80 sm:px-10">
          <form className="space-y-4" onSubmit={handleRegister}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@business.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password * (Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="SecurePassword@2026!"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Role Specific Fields */}
            {role === "CUSTOMER" ? (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. John Sharma"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. EcoRetail Direct"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Business Type
                    </label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    >
                      <option value="E-commerce Retailer">E-commerce Retailer</option>
                      <option value="D2C Brand">D2C Brand</option>
                      <option value="Marketplace Seller">Marketplace Seller</option>
                      <option value="Enterprise Trader">Enterprise Trader</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Bengaluru"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Marketplaces (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={marketplacePresence}
                    onChange={(e) => setMarketplacePresence(e.target.value)}
                    placeholder="Amazon, Flipkart, Shopify"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Legal Entity Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      placeholder="e.g. Green Express Logistics Pvt Ltd"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Display / Brand Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. GreenLogix"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Entity Type
                    </label>
                    <select
                      value={entityType}
                      onChange={(e) => setEntityType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    >
                      <option value="PRIVATE_LIMITED">Private Limited (Pvt Ltd)</option>
                      <option value="PUBLIC_LIMITED">Public Limited</option>
                      <option value="LLP">Limited Liability Partnership (LLP)</option>
                      <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                      <option value="PARTNERSHIP">Partnership</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Operating Locations
                    </label>
                    <input
                      type="text"
                      value={operatingLocations}
                      onChange={(e) => setOperatingLocations(e.target.value)}
                      placeholder="Bengaluru, Mumbai, Delhi"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Provider Bio & Services Overview
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Brief description of supply chain & warehousing services..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition"
              >
                {loading
                  ? "Processing Registration..."
                  : `Register as ${role === "CUSTOMER" ? "Customer" : "Service Provider"}`}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 mt-6">
        EcoPartnerHub &copy; 2026. Secure Registration & Verification Architecture.
      </div>
    </div>
  );
}
