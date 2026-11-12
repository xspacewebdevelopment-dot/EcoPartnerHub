# 🌿 EcoPartnerHub

[![CI Pipeline](https://github.com/xspacewebdevelopment-dot/EcoPartnerHub/actions/workflows/ci.yml/badge.svg)](https://github.com/xspacewebdevelopment-dot/EcoPartnerHub/actions)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

EcoPartnerHub is a collaborative platform designed for sustainable partner ecosystems. Built using Next.js App Router, React 19, TypeScript, and modern continuous integration.

---

## 🏛️ Team Development Rules & Workflow

This repository enforces strict branching, PR review policies, and automated testing gates:

```
[feature/<purpose>]  ──(PR + CI + Review)──>  [staging]  ──(PR + CI + Admin Approval)──>  [main] (Production)
```

1. **`main` Branch**: **Untouchable and unchangeable directly.** No one can push directly to `main`. Merges are only permitted via Pull Request originating from `staging` after passing CI and lead approval.
2. **`staging` Branch**: Integration branch. All new work merges here first via Pull Request from `feature/<purpose>`.
3. **`feature/<purpose>` Branches**: Individual branches for developing specific features, bug fixes, or enhancements.

> 📖 Read the complete [Branching Strategy & Rules Guide](BRANCHING_STRATEGY.md) and [Contributing Guide](CONTRIBUTING.md).

---

## ⚙️ Automated PR Verification (CI)

Every Pull Request to `staging` or `main` automatically runs the GitHub Actions CI pipeline:

1. **Branch Naming Enforcement**: Validates that feature branches follow `feature/<purpose>` and that PRs to `main` come strictly from `staging`.
2. **TypeScript Compilation Check**: Ensures no type discrepancies exist (`npm run type-check`).
3. **ESLint Code Quality**: Ensures all rules and standards are upheld (`npm run lint`).
4. **Production Build Validation**: Compiles the Next.js server build to verify zero build errors (`npm run build`).

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/xspacewebdevelopment-dot/EcoPartnerHub.git
cd EcoPartnerHub

# Install dependencies
npm install
```

### Running Locally

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Runs the Next.js local development server |
| **Type Check** | `npm run type-check` | Validates TypeScript types across the codebase |
| **Lint** | `npm run lint` | Inspects code for syntax and style violations |
| **Production Build** | `npm run build` | Generates the optimized production build |
| **Run Production** | `npm run start` | Starts the production Next.js server |
| **Full Test Suite** | `npm test` | Runs type-check, lint, and build sequentially |

---

## 🌐 Hosting & Deployment

EcoPartnerHub is optimized for deployment on modern cloud platforms:

### 1. Vercel (Recommended)
1. Import repository `xspacewebdevelopment-dot/EcoPartnerHub` into Vercel.
2. Set Production branch to `main`.
3. Set Preview branch to `staging`. Every PR to `staging` automatically receives a live Preview URL!

### 2. Node.js Production Server
```bash
npm run build
npm run start
```
By default, the server runs on port 3000. Use environment variables (e.g. `PORT=8080`) to customize.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
