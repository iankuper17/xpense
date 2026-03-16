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

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const { data: monthTx } = await supabase
      .from("transactions")
      .select("amount, transaction_type")
      .eq("user_id", user.id)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth);

    const { data: recentTx } = await supabase
      .from("transactions")
      .select("id, amount, currency, date, merchant, transaction_type, category_id, card_id")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(5);

    const { count: alertCount } = await supabase
      .from("fraud_alerts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_resolved", false);

    const { count: unclassifiedCount } = await supabase
      .from("unclassified_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_resolved", false);

    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, icon, color")
      .or(`user_id.eq.${user.id},is_system.eq.true`);

    const { data: cards } = await supabase
      .from("cards")
      .select("id, name, last_four")
      .eq("user_id", user.id);

    const totalExpenses = (monthTx || [])
      .filter(t => t.transaction_type === "expense")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const totalIncome = (monthTx || [])
      .filter(t => t.transaction_type === "income")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const totalRefunds = (monthTx || [])
      .filter(t => t.transaction_type === "refund")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const catMap = Object.fromEntries((categories || []).map(c => [c.id, c]));
    const cardMap = Object.fromEntries((cards || []).map(c => [c.id, c]));

    const recentTransactions = (recentTx || []).map(tx => ({
      id: tx.id,
      amount: Number(tx.amount) || 0,
      currency: tx.currency || "MXN",
      date: tx.date || "",
      merchant: tx.merchant || "Desconocido",
      transaction_type: tx.transaction_type || "expense",
      category: tx.category_id ? catMap[tx.category_id] || null : null,
      card: tx.card_id ? cardMap[tx.card_id] || null : null,
    }));

    return NextResponse.json({
      totalExpenses,
      totalIncome,
      totalRefunds,
      balance: totalIncome - totalExpenses + totalRefunds,
      recentTransactions,
      alertCount: alertCount || 0,
      unclassifiedCount: unclassifiedCount || 0,
    });
  } catch (error) {
    console.error("Dashboard data API error:", error);
    return NextResponse.json(
      { error: "Error loading dashboard data", details: String(error) },
      { status: 500 }
    );
  }
}
