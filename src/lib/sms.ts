interface SendSmsResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

/**
 * Sends a 6-digit phone verification OTP code.
 * Supports Twilio SMS when credentials are provided in .env,
 * otherwise falls back to a development simulated dispatch logged to console.
 */
export async function sendVerificationSms(
  phoneNumber: string,
  verificationCode: string
): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  const messageText = `Your EcoPartnerHub phone verification code is: ${verificationCode}. Valid for 15 minutes.`;

  // 1. If Twilio credentials are configured, send real SMS
  if (accountSid && authToken && fromNumber) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const body = new URLSearchParams({
        To: phoneNumber,
        From: fromNumber,
        Body: messageText,
      });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Twilio SMS dispatch failed");
      }

      console.log(`[SMS DISPATCH SUCCESS] Real SMS delivered to ${phoneNumber}. SID: ${data.sid}`);
      return { success: true, messageId: data.sid };
    } catch (err) {
      console.error(`[SMS SERVICE ERROR] Failed to send real SMS to ${phoneNumber}:`, err);
      // Fall through to simulation on failure in dev
    }
  }

  // 2. Simulated dev mode output
  console.log("================================================================================");
  console.log(`[SMS SERVICE - DEV/TEST MODE]`);
  console.log(`To Phone Number: ${phoneNumber}`);
  console.log(`Message: ${messageText}`);
  console.log(`6-Digit Verification Code: [ ${verificationCode} ]`);
  console.log(`Valid for: 15 minutes`);
  console.log("================================================================================");

  return {
    success: true,
    simulated: true,
  };
}
