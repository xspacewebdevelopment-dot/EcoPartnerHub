"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  accountStatus: string;
}

export default function VerifyPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Email Verification State
  const [emailCode, setEmailCode] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);

  // Phone Verification State
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const fetchUserProfile = async (authToken: string) => {
    try {
      const res = await fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        if (data.user.phone) {
          setPhoneInput(data.user.phone);
        }
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem("authToken");
      if (savedToken) {
        setToken(savedToken);
        await fetchUserProfile(savedToken);
      } else {
        setLoadingUser(false);
      }
    };
    void initAuth();
  }, []);

  // 1. Send Email Verification Code
  const handleSendEmailCode = async () => {
    if (!token && !user?.email) return;
    setEmailSending(true);
    setEmailError(null);
    setEmailMessage(null);
    setEmailPreviewUrl(null);

    try {
      const res = await fetch("/api/auth/verify-email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: user?.email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setEmailError(data.error || "Failed to dispatch verification email.");
      } else {
        setEmailMessage(data.message);
        if (data.previewUrl) {
          setEmailPreviewUrl(data.previewUrl);
        }
        if (data.code) {
          setEmailCode(data.code);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setEmailError(msg);
    } finally {
      setEmailSending(false);
    }
  };

  // 2. Confirm Email Verification Code
  const handleConfirmEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailCode) return;
    setEmailVerifying(true);
    setEmailError(null);
    setEmailMessage(null);

    try {
      const res = await fetch("/api/auth/verify-email/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code: emailCode.trim(),
          email: user?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setEmailError(data.error || "Verification failed. Please check code.");
      } else {
        setEmailMessage("Email verified successfully! ✓");
        if (token) {
          fetchUserProfile(token);
        } else if (user) {
          setUser({ ...user, isEmailVerified: true });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setEmailError(msg);
    } finally {
      setEmailVerifying(false);
    }
  };

  // 3. Send Phone Verification Code
  const handleSendPhoneCode = async () => {
    const targetPhone = phoneInput.trim() || user?.phone;
    if (!targetPhone) {
      setPhoneError("Please enter a phone number.");
      return;
    }

    setPhoneSending(true);
    setPhoneError(null);
    setPhoneMessage(null);

    try {
      const res = await fetch("/api/auth/verify-phone/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone: targetPhone }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPhoneError(data.error || "Failed to dispatch verification SMS.");
      } else {
        setPhoneMessage(data.message);
        if (data.code) {
          setPhoneCode(data.code);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setPhoneError(msg);
    } finally {
      setPhoneSending(false);
    }
  };

  // 4. Confirm Phone Verification Code
  const handleConfirmPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneCode) return;
    setPhoneVerifying(true);
    setPhoneError(null);
    setPhoneMessage(null);

    try {
      const res = await fetch("/api/auth/verify-phone/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code: phoneCode.trim(),
          phone: phoneInput.trim() || user?.phone,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPhoneError(data.error || "Phone verification failed. Please check code.");
      } else {
        setPhoneMessage("Phone number verified successfully! ✓");
        if (token) {
          fetchUserProfile(token);
        } else if (user) {
          setUser({ ...user, isPhoneVerified: true });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setPhoneError(msg);
    } finally {
      setPhoneVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full mx-auto space-y-8">
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
            Account Verification Center
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Verify your email address and mobile phone number to secure your account.
          </p>
        </div>

        {/* User Session Bar */}
        {loadingUser ? (
          <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            Loading account status...
          </div>
        ) : user ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="text-xs text-slate-500 font-medium">Logged in account:</div>
              <div className="font-bold text-slate-900 text-sm">{user.email}</div>
              <div className="text-xs text-slate-600">Role: <span className="font-semibold text-emerald-700">{user.role}</span></div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
              >
                Go to Dashboard →
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 flex items-center justify-between">
            <span>You are not signed in. You can sign in to auto-verify your profile.</span>
            <Link href="/login" className="font-semibold underline ml-2">
              Sign In Now →
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ================= CARD 1: EMAIL VERIFICATION ================= */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-md flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                    ✉
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Email Verification
                  </h3>
                </div>
                {user?.isEmailVerified ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    ⚠ Unverified
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600">
                Email: <strong className="text-slate-800">{user?.email || "customer@ecopartnerhub.com"}</strong>
              </div>

              {emailMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 font-medium">
                  {emailMessage}
                </div>
              )}

              {emailError && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-800 font-medium">
                  {emailError}
                </div>
              )}

              {/* Live Mailbox Preview URL if available */}
              {emailPreviewUrl && (
                <div className="p-3 bg-sky-50 border border-sky-300 rounded-lg text-xs space-y-2">
                  <div className="font-bold text-sky-950 flex items-center gap-1.5">
                    <span>📬</span> Ethereal Mailbox Delivered
                  </div>
                  <a
                    href={emailPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-3 py-1.5 rounded-md bg-sky-600 text-white font-semibold hover:bg-sky-700 transition"
                  >
                    Open Mailbox (View Email) ↗
                  </a>
                </div>
              )}

              <button
                type="button"
                onClick={handleSendEmailCode}
                disabled={emailSending || user?.isEmailVerified}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition"
              >
                {emailSending ? "Sending code..." : user?.isEmailVerified ? "Email Already Verified ✓" : "Send 6-Digit Email Code"}
              </button>

              {!user?.isEmailVerified && (
                <form onSubmit={handleConfirmEmailCode} className="space-y-3 pt-2 border-t border-slate-100">
                  <label htmlFor="email-code-input" className="block text-xs font-semibold text-slate-700">
                    Enter 6-Digit Email Code:
                  </label>
                  <input
                    id="email-code-input"
                    type="text"
                    required
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                    placeholder="••••••"
                    className="font-mono text-center text-lg tracking-[0.3em] font-bold block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={emailVerifying || !emailCode}
                    className="w-full py-2 px-4 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold disabled:opacity-50 transition"
                  >
                    {emailVerifying ? "Verifying..." : "Confirm & Verify Email"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* ================= CARD 2: PHONE VERIFICATION ================= */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-md flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                    📱
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Phone Verification
                  </h3>
                </div>
                {user?.isPhoneVerified ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    ⚠ Unverified
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="phone-number-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number (E.164 / International):
                </label>
                <input
                  id="phone-number-input"
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+919876543210"
                  disabled={user?.isPhoneVerified}
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg shadow-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50"
                />
              </div>

              {phoneMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 font-medium">
                  {phoneMessage}
                </div>
              )}

              {phoneError && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-800 font-medium">
                  {phoneError}
                </div>
              )}

              <button
                type="button"
                onClick={handleSendPhoneCode}
                disabled={phoneSending || user?.isPhoneVerified || !phoneInput.trim()}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition"
              >
                {phoneSending ? "Sending SMS OTP..." : user?.isPhoneVerified ? "Phone Already Verified ✓" : "Send 6-Digit SMS Code"}
              </button>

              {!user?.isPhoneVerified && (
                <form onSubmit={handleConfirmPhoneCode} className="space-y-3 pt-2 border-t border-slate-100">
                  <label htmlFor="phone-code-input" className="block text-xs font-semibold text-slate-700">
                    Enter 6-Digit SMS Code:
                  </label>
                  <input
                    id="phone-code-input"
                    type="text"
                    required
                    maxLength={6}
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    placeholder="••••••"
                    className="font-mono text-center text-lg tracking-[0.3em] font-bold block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={phoneVerifying || !phoneCode}
                    className="w-full py-2 px-4 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold disabled:opacity-50 transition"
                  >
                    {phoneVerifying ? "Verifying..." : "Confirm & Verify Phone"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          EcoPartnerHub &copy; 2026. Account security enforced via cryptographic verification & Twilio/Nodemailer.
        </div>
      </div>
    </div>
  );
}
