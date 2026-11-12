# Contributing to EcoPartnerHub

Welcome to **EcoPartnerHub**! We are building this platform collaboratively in a team environment. To ensure high code quality, security, and a seamless developer experience, please follow these guidelines.

---

## 🛠️ Prerequisites

- **Node.js**: v20 or higher (`node -v`)
- **npm**: v10 or higher (`npm -v`)
- **Git**: v2.30 or higher

---

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/xspacewebdevelopment-dot/EcoPartnerHub.git
   cd EcoPartnerHub
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🌿 Branching Rules (Mandatory)

1. **Never commit directly to `main` or `staging`.**
2. **Every feature branch must follow the convention:**
   ```bash
   feature/<purpose>
   ```
   *Examples:* `feature/user-auth`, `feature/landing-page`, `feature/api-endpoints`
3. Always branch off the latest `staging`:
   ```bash
   git checkout staging
   git pull origin staging
   git checkout -b feature/<purpose>
   ```

---

## 🧪 Testing and Quality Checks

Before pushing and opening a pull request, verify that all local checks pass:

```bash
# Run all checks at once:
npm test
```

Or run individual commands:

| Command | Description |
| :--- | :--- |
| `npm run type-check` | Runs the TypeScript compiler check (`tsc --noEmit`) without emitting files |
| `npm run lint` | Runs ESLint to inspect code conventions and potential errors |
| `npm run build` | Compiles the Next.js app for production |

> [!WARNING]
> GitHub Actions CI will automatically test every pull request. If any of these checks fail, your PR cannot be approved or merged.

---

## 📬 Submitting a Pull Request (PR)

1. Push your branch:
   ```bash
   git push -u origin feature/<purpose>
   ```
2. Navigate to [GitHub](https://github.com/xspacewebdevelopment-dot/EcoPartnerHub) and open a Pull Request targeting the **`staging`** branch.
3. Fill out the pull request template completely.
4. Ensure the CI checks pass (green checkmark).
5. Request review from the repository owner or team lead.
6. Once approved, the branch will be merged into `staging`.
