import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-100 text-slate-800 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-emerald-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              E
            </span>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              EcoPartnerHub
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
              Team Core
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-700 hover:text-emerald-600 px-3 py-1.5 transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-lg shadow-xs transition"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col gap-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Week 1 Milestone: Authentication & Role Management Live
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            EcoPartnerHub <span className="text-emerald-600">Platform</span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Collaborative, sustainable engineering workspace configured with multi-tier branch protection, automated quality gates, and Next.js production infrastructure.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition"
            >
              Launch Login Console
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-emerald-500 text-slate-800 font-semibold text-sm shadow-xs transition"
            >
              Customer & Provider Registration
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 font-semibold text-sm shadow-xs transition"
            >
              RBAC Live Test Console
            </Link>
          </div>
        </div>

        {/* Auth & RBAC Architecture Highlights */}
        <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-xs ring-1 ring-emerald-500/10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Week 1 Backend Foundation & RBAC System
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Full 4-role permission hierarchy with token revocation, password hashing, and Postman test verification suite.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
              23/23 API Tests Passed (100%)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-emerald-800">CUSTOMER</div>
              <div className="text-[11px] text-slate-500 mt-1">Free registration, enquiries, customer dashboard</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-blue-800">PROVIDER</div>
              <div className="text-[11px] text-slate-500 mt-1">Verified logistics profile, provider dashboard</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-amber-800">ADMIN</div>
              <div className="text-[11px] text-slate-500 mt-1">Operations dashboard, user moderation & suspend</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-purple-800">SUPER_ADMIN</div>
              <div className="text-[11px] text-slate-500 mt-1">Controlled initial seed, create admins, platform audit</div>
            </div>
          </div>
        </div>

        {/* Workflow Diagram & Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Rule 1: Feature Branches */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900">Feature Branches</h3>
              <p className="text-sm text-slate-600">
                All development starts in isolated branches following the convention:
              </p>
              <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg text-xs font-mono">
                feature/&lt;purpose&gt;
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Target:</span>
              <span className="font-semibold text-slate-700">PR to staging</span>
            </div>
          </div>

          {/* Rule 2: Staging Gateway */}
          <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm flex flex-col justify-between hover:shadow-md transition ring-1 ring-emerald-500/10">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm border border-emerald-100">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900">Staging Branch</h3>
              <p className="text-sm text-slate-600">
                Integration branch where all features are consolidated, tested, and reviewed.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>Automated CI (lint, types, build)</li>
                <li>Mandatory code review & approval</li>
                <li>Preview deployments</li>
              </ul>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Target:</span>
              <span className="font-semibold text-emerald-700">PR to main</span>
            </div>
          </div>

          {/* Rule 3: Protected Main */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm border border-amber-100">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900">Protected Main</h3>
              <p className="text-sm text-slate-600">
                Production-grade branch with strict zero-direct-push rule.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>Untouchable & unchangeable directly</li>
                <li>Only accepts PRs from <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">staging</code></li>
                <li>Lead reviewer approval required</li>
              </ul>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Status:</span>
              <span className="font-semibold text-amber-600">Production Ready</span>
            </div>
          </div>
        </div>

        {/* Automated Quality Gates */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Automated PR Verification Pipeline</h2>
          <p className="text-sm text-slate-600 mb-6">
            Every pull request triggers GitHub Actions CI to execute test suites before approval:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gate 1</div>
              <div className="text-base font-bold text-slate-800">TypeScript Check</div>
              <div className="mt-2 text-xs font-mono bg-white p-2 rounded border border-slate-200 text-slate-600">
                npm run type-check
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gate 2</div>
              <div className="text-base font-bold text-slate-800">ESLint Quality</div>
              <div className="mt-2 text-xs font-mono bg-white p-2 rounded border border-slate-200 text-slate-600">
                npm run lint
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gate 3</div>
              <div className="text-base font-bold text-slate-800">Auth & RBAC Test</div>
              <div className="mt-2 text-xs font-mono bg-white p-2 rounded border border-slate-200 text-slate-600">
                npm run test:auth
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gate 4</div>
              <div className="text-base font-bold text-slate-800">Production Build</div>
              <div className="mt-2 text-xs font-mono bg-white p-2 rounded border border-slate-200 text-slate-600">
                npm run build
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>EcoPartnerHub © 2026. Configured for high-reliability team collaboration.</div>
          <div className="flex items-center gap-4">
            <span>Branch: feature/auth-role-management</span>
            <span>•</span>
            <span>PR Target: staging</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
