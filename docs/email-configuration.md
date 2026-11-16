# Email Service & SMTP Configuration Guide

EcoPartnerHub uses a decoupled email service architecture ([src/lib/email.ts](file:///c:/Users/Akshay/EcoPartnerHub/src/lib/email.ts)). The authentication controllers (`/api/auth/forgot-password`, `/api/auth/verify-email`, etc.) only interact with high-level functions like `sendPasswordResetEmail()` and `sendEmailVerificationEmail()`. All transport logic, provider selection, and credentials are completely isolated from the authentication business logic.

---

## 1. Current Phase: Development & Ethereal Testing (Zero-Config)

During initial development, no real SMTP account is required.
- If SMTP credentials are not set in `.env`, the system automatically provisions an **Ethereal Email** test mailbox account on the fly.
- When an OTP or reset code is sent, the API response and server console output provide a `previewUrl`.
- Clicking the link opens the message in a web browser exactly as it would appear in a live inbox.

---

## 2. Next Phase: Switching to Real Gmail Delivery

When ready to switch to live Gmail delivery, **no code changes in the authentication system are required**. Simply supply the Gmail credentials in `.env`:

### Step 1: Generate a Google App Password
1. Sign in to the designated Google Account (`myaccount.google.com`).
2. Navigate to **Security** and verify **2-Step Verification** is enabled.
3. Open **App Passwords** ([myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
4. Create an app named `EcoPartnerHub`.
5. Copy the generated 16-character password (e.g., `abcd efgh ijkl mnop`).

### Step 2: Update `.env`
Add the following configuration to `.env`:

```env
# Gmail SMTP Configuration
SMTP_SERVICE="gmail"
SMTP_USER="your-organization-or-service-account@gmail.com"
SMTP_PASS="your-16-character-app-password"
EMAIL_FROM="EcoPartnerHub Security <your-organization-or-service-account@gmail.com>"
```

### Step 3: Restart the Application
Restart your Next.js development or production server (`npm run dev` or `npm start`). 
The email utility will detect `SMTP_SERVICE="gmail"` and route all outbound OTPs and password reset emails through Google's mail servers.

---

## 3. Alternative Production SMTP Providers (SendGrid / AWS SES / Brevo)

If migrating to an enterprise transactional mail provider instead of Gmail, configure standard host credentials without touching any auth code:

```env
SMTP_HOST="smtp.sendgrid.net" # or email-smtp.us-east-1.amazonaws.com
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
EMAIL_FROM="EcoPartnerHub Security <no-reply@yourdomain.com>"
```

---

## 4. OTP Lifecycle & Security Specification

| Feature | Specification |
|---|---|
| **Code Format** | 6-digit numeric string (`100000`–`999999`) generated via `crypto.randomInt` |
| **TTL / Expiry** | 15 minutes (`Date.now() + 15 * 60 * 1000`) |
| **Single Use** | Marked `used: true` upon successful verification within a database transaction |
| **Invalidation** | Requesting a new OTP automatically marks prior active tokens for that user as used |
| **Session Revocation** | Completing password reset increments `user.tokenVersion`, immediately invalidating all existing JWT sessions |
