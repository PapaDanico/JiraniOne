// SMS via Africa's Talking — stubbed when credentials absent

interface SmsOptions {
  to: string;
  message: string;
}

export async function sendSms({ to, message }: SmsOptions): Promise<boolean> {
  const apiKey = process.env.SMS_API_KEY;
  const username = process.env.SMS_USERNAME;

  if (!apiKey || !username || apiKey === "your_africastalking_api_key") {
    console.info(`[SMS STUB] To: ${to}\n${message}`);
    return true;
  }

  try {
    const body = new URLSearchParams({
      username,
      to,
      message,
      from: "JiraniHub",
    });

    const res = await fetch(
      "https://api.africastalking.com/version1/messaging",
      {
        method: "POST",
        headers: {
          apiKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );

    return res.ok;
  } catch (err) {
    console.error("[SMS] Failed to send:", err);
    return false;
  }
}
