export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) return NextResponse.json({ step: "auth", error: authError.message });
    if (!user) return NextResponse.json({ step: "auth", error: "no user" });

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) return NextResponse.json({ step: "profile", error: profileError.message, code: profileError.code });

    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("amount, transaction_type")
      .eq("user_id", user.id)
      .limit(5);

    if (txError) return NextResponse.json({ step: "transactions", error: txError.message, code: txError.code });

    const { data: recent, error: recentError } = await supabase
      .from("transactions")
      .select("*, category:categories(name, icon, color), card:cards(name, last_four)")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(5);

    if (recentError) return NextResponse.json({ step: "recent_transactions", error: recentError.message, code: recentError.code });

    const { count: alertCount, error: alertError } = await supabase
      .from("fraud_alerts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_resolved", false);

    if (alertError) return NextResponse.json({ step: "alerts", error: alertError.message, code: alertError.code });

    const { count: unclassifiedCount, error: unclError } = await supabase
      .from("unclassified_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_resolved", false);

    if (unclError) return NextResponse.json({ step: "unclassified", error: unclError.message, code: unclError.code });

    const { data: budgets, error: budgetError } = await supabase
      .from("budgets")
      .select("*, category:categories(name, icon)")
      .eq("user_id", user.id);

    if (budgetError) return NextResponse.json({ step: "budgets", error: budgetError.message, code: budgetError.code });

    return NextResponse.json({
      success: true,
      userId: user.id,
      profile: { email: profile?.email, name: profile?.full_name },
      transactionCount: transactions?.length ?? 0,
      recentCount: recent?.length ?? 0,
      alertCount,
      unclassifiedCount,
      budgetCount: budgets?.length ?? 0,
    });
  } catch (err) {
    return NextResponse.json({ step: "catch", error: String(err) });
  }
}
