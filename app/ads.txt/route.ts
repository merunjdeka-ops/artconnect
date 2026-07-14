import { NextResponse } from "next/server";

// Serves /ads.txt for AdSense verification. Empty until
// NEXT_PUBLIC_ADSENSE_CLIENT is configured.
export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
  const pub = client.replace(/^ca-/, "");
  const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : "";
  return new NextResponse(body, { headers: { "content-type": "text/plain" } });
}
