import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "NOT SET";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ? "SET (hidden)" : "NOT SET";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "NOT SET";

  // Build the same URL that getAuthUrl() would build
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.json({
    clientId: clientId.substring(0, 20) + "...",
    clientSecretStatus: clientSecret,
    redirectUri,
    generatedAuthUrl: authUrl,
  });
}
