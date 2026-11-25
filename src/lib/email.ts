import nodemailer, { type Transporter } from "nodemailer";

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | false;
  error?: string;
  isEthereal?: boolean;
  simulated?: boolean;
}

// Cached Ethereal transporter in dev mode to avoid re-creating test account on every request
let cachedEtherealTransporter: Transporter | null = null;

async function getTransporter(): Promise<{
  transporter: Transporter;
  isEthereal: boolean;
}> {
  const service = process.env.SMTP_SERVICE; // "gmail", "yahoo", "outlook", etc.
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  // 1. If direct service name (like Gmail or Yahoo) is configured
  if (service && user && pass) {
    const transporter = nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
    return { transporter, isEthereal: false };
  }

  // 2. If standard custom SMTP host credentials are provided, use them
  if (host && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    return { transporter, isEthereal: false };
  }

  // 2. Otherwise, use an automated Ethereal Email test mailbox
  if (cachedEtherealTransporter) {
    return { transporter: cachedEtherealTransporter, isEthereal: true };
  }

  const testAccount = await nodemailer.createTestAccount();
  cachedEtherealTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return { transporter: cachedEtherealTransporter, isEthereal: true };
}

/**
 * Sends a 6-digit password reset verification code to the target email address.
 * Delivers either via configured production SMTP or via Ethereal online test mailbox.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetCode: string
): Promise<SendEmailResult> {
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    '"EcoPartnerHub Security" <no-reply@ecopartnerhub.com>';

  const subject = `${resetCode} is your EcoPartnerHub verification code`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Reset Your Password - EcoPartnerHub</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #059669; padding: 28px 32px; text-align: left;">
              <div style="display: inline-block; width: 36px; height: 36px; background-color: #ffffff; border-radius: 10px; text-align: center; line-height: 36px; font-weight: 900; font-size: 20px; color: #059669; vertical-align: middle; margin-right: 12px;">E</div>
              <span style="color: #ffffff; font-size: 22px; font-weight: 800; vertical-align: middle; letter-spacing: -0.5px;">EcoPartnerHub</span>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <h1 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -0.5px;">Password Reset Code</h1>
              <p style="color: #475569; font-size: 14px; line-height: 22px; margin: 0 0 24px 0;">
                We received a request to reset your EcoPartnerHub account password. Use the 6-digit verification code below to complete your password reset:
              </p>

              <!-- 6-digit Code Box -->
              <div style="background-color: #f0fdf4; border: 2px dashed #059669; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
                <div style="color: #065f46; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Your 6-Digit Code</div>
                <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #047857; padding-left: 10px;">${resetCode}</div>
              </div>

              <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 6px; margin: 0 0 24px 0;">
                <p style="color: #334155; font-size: 13px; line-height: 20px; margin: 0;">
                  ⏱ <strong>Validity:</strong> This code is valid for <strong>15 minutes</strong> and can only be used once.
                </p>
              </div>

              <p style="color: #64748b; font-size: 12px; line-height: 18px; margin: 0;">
                If you did not request this password reset, you can safely ignore this email. Your current password will remain unchanged and your account is secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 16px;">
                EcoPartnerHub &copy; 2026. Protected by Role-Based Access Control (RBAC).<br>
                This is an automated security message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `EcoPartnerHub Password Reset Code\n\nYour 6-digit password reset verification code is:\n\n${resetCode}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this code, you can safely ignore this email.`;

  try {
    const { transporter, isEthereal } = await getTransporter();

    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      text,
      html,
    });

    const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : undefined;

    console.log("================================================================================");
    console.log(`[EMAIL DISPATCH SUCCESS]`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`6-Digit Verification Code: [ ${resetCode} ]`);
    if (isEthereal && previewUrl) {
      console.log(`Mailbox URL (Ethereal View): ${previewUrl}`);
    }
    console.log("================================================================================");

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
      isEthereal,
    };
  } catch (error) {
    console.error(`[EMAIL SERVICE ERROR] Failed to send email to ${toEmail}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to deliver email",
    };
  }
}

/**
 * Sends a 6-digit email address verification code to confirm ownership.
 */
export async function sendEmailVerificationEmail(
  toEmail: string,
  verificationCode: string
): Promise<SendEmailResult> {
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    '"EcoPartnerHub Security" <no-reply@ecopartnerhub.com>';

  const subject = `${verificationCode} is your EcoPartnerHub email verification code`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Verify Your Email - EcoPartnerHub</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background-color: #059669; padding: 28px 32px; text-align: left;">
              <div style="display: inline-block; width: 36px; height: 36px; background-color: #ffffff; border-radius: 10px; text-align: center; line-height: 36px; font-weight: 900; font-size: 20px; color: #059669; vertical-align: middle; margin-right: 12px;">E</div>
              <span style="color: #ffffff; font-size: 22px; font-weight: 800; vertical-align: middle; letter-spacing: -0.5px;">EcoPartnerHub</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px;">
              <h1 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -0.5px;">Verify Your Email Address</h1>
              <p style="color: #475569; font-size: 14px; line-height: 22px; margin: 0 0 24px 0;">
                Welcome to EcoPartnerHub! Please enter the 6-digit verification code below to verify your email address:
              </p>
              <div style="background-color: #f0fdf4; border: 2px dashed #059669; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
                <div style="color: #065f46; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Your 6-Digit Email Code</div>
                <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #047857; padding-left: 10px;">${verificationCode}</div>
              </div>
              <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 6px; margin: 0 0 24px 0;">
                <p style="color: #334155; font-size: 13px; line-height: 20px; margin: 0;">
                  ⏱ <strong>Validity:</strong> This code is valid for <strong>15 minutes</strong>.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 16px;">
                EcoPartnerHub &copy; 2026. Protected by Role-Based Access Control (RBAC).
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `EcoPartnerHub Email Verification\n\nYour 6-digit verification code is: ${verificationCode}\n\nThis code will expire in 15 minutes.`;

  try {
    const { transporter, isEthereal } = await getTransporter();
    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      text,
      html,
    });

    const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : undefined;

    console.log("================================================================================");
    console.log(`[EMAIL VERIFICATION CODE SENT]`);
    console.log(`To: ${toEmail}`);
    console.log(`Code: [ ${verificationCode} ]`);
    if (isEthereal && previewUrl) {
      console.log(`Mailbox URL (Ethereal View): ${previewUrl}`);
    }
    console.log("================================================================================");

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
      isEthereal,
    };
  } catch (error) {
    console.error(`[EMAIL VERIFICATION ERROR] Failed to send code to ${toEmail}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to deliver email verification code",
    };
  }
}

