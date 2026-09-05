import { NextResponse } from "next/server";
import { verifyGoogleAuthTOTP, getAccountBase32Secret } from "@/lib/totp";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limit 2FA verification attempts
    const ip = getClientIp(request);
    const rl = checkRateLimit(`2fa:${ip}`, RATE_LIMITS.twoFactor);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { token, email } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "2FA verification code is required" }, { status: 400 });
    }

    const cleanToken = token.trim();
    if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
      return NextResponse.json({ error: "Please enter a valid 6-digit code" }, { status: 400 });
    }

    // Server determines the secret — client cannot supply it
    const activeSecret = getAccountBase32Secret(email);
    const isValid = verifyGoogleAuthTOTP(cleanToken, activeSecret);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid 6-digit Google Authenticator code. Please check the current code on your device." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "2FA authentication verified successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "2FA verification failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
