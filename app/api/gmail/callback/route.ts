export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getTokensFromCode, getUserEmail } from "@/lib/gmail/client";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
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

    // Store tokens in Supabase Vault via service client
    const serviceClient = createServiceClient();

    const { data: accessSecret } = await serviceClient.rpc("vault.create_secret", {
      new_secret: tokens.access_token,
      new_name: `gmail_access_${user.id}_${email}`,
    });

    const { data: refreshSecret } = await serviceClient.rpc("vault.create_secret", {
      new_secret: tokens.refresh_token,
      new_name: `gmail_refresh_${user.id}_${email}`,
    });

    // Save gmail account with vault secret references
    await supabase.from("gmail_accounts").upsert({
      user_id: user.id,
      email,
      access_token_secret_id: accessSecret,
      refresh_token_secret_id: refreshSecret,
      token_expiry: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      is_active: true,
    }, {
      onConflict: "user_id,email",
    });

    return NextResponse.redirect(`${origin}/onboarding?gmail=connected`);
  } catch (error) {
    console.error("Gmail callback error:", error);
    const { origin } = new URL(request.url);
    return NextResponse.redirect(`${origin}/onboarding?error=gmail_failed`);
  }
}
