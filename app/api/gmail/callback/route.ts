export const dynamic = "force-dynamic";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getTokensFromCode, getUserEmail } from "@/lib/gmail/client";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  try {
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(`${origin}/onboarding?error=no_code`);
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/auth/login`);
    }

    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${origin}/onboarding?error=no_tokens`);
    }

    const email = await getUserEmail(tokens.access_token, tokens.refresh_token);

    // Store tokens directly in gmail_accounts (encrypted columns)
    const serviceClient = createServiceClient();

    await serviceClient.from("gmail_accounts").upsert({
      user_id: user.id,
      email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      is_active: true,
    }, {
      onConflict: "user_id,email",
    });

    // Check if user has completed onboarding
    const { data: profile } = await supabase
      .from("users")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    const redirectPath = profile?.onboarding_completed
      ? "/dashboard/settings/accounts?gmail=connected"
      : "/onboarding?gmail=connected";

    return NextResponse.redirect(`${origin}${redirectPath}`);
  } catch (error) {
    console.error("Gmail callback error:", error);
    return NextResponse.redirect(`${origin}/onboarding?error=gmail_failed`);
  }
}
