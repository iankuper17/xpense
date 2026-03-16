export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: transactions } = await supabase
      .from("transactions")
      .select("id, amount, currency, date, merchant, transaction_type, confidence, confirmed_by_user, needs_review, category_id, card_id")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(100);

    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, icon, color, user_id, is_system, created_at")
      .or(`user_id.eq.${user.id},is_system.eq.true`);

    const { data: cards } = await supabase
      .from("cards")
      .select("id, name, last_four, color")
      .eq("user_id", user.id);

    const catMap = Object.fromEntries((categories || []).map(c => [c.id, c]));
    const cardMap = Object.fromEntries((cards || []).map(c => [c.id, c]));

    const txList = (transactions || []).map(tx => ({
      id: tx.id,
      amount: Number(tx.amount) || 0,
      currency: tx.currency || "MXN",
      date: tx.date || "",
      merchant: tx.merchant || "Desconocido",
      transaction_type: tx.transaction_type || "expense",
      confidence: Number(tx.confidence) || 0,
      confirmed_by_user: tx.confirmed_by_user || false,
      needs_review: tx.needs_review || false,
      category: tx.category_id ? catMap[tx.category_id] || null : null,
      card: tx.card_id ? cardMap[tx.card_id] || null : null,
    }));

    return NextResponse.json({
      transactions: txList,
      categories: categories || [],
    });
  } catch (error) {
    console.error("Transactions data API error:", error);
    return NextResponse.json(
      { error: "Error loading transactions", details: String(error) },
      { status: 500 }
    );
  }
}
