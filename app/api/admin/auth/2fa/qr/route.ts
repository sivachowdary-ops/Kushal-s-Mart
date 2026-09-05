import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { generateTOTPQRCodeDataUrl, getGoogleAuthUri, getAccountBase32Secret } from "@/lib/totp";

export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = (admin as { email?: string }).email || searchParams.get("email") || "admin";
    const secret = getAccountBase32Secret(email);

    const qrDataUrl = await generateTOTPQRCodeDataUrl(email, secret, "KushalsMart");
    const uri = getGoogleAuthUri(email, secret, "KushalsMart");

    return NextResponse.json({
      success: true,
      qrDataUrl,
      secret,
      uri,
      account: email,
      issuer: "KushalsMart",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate QR Code";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
