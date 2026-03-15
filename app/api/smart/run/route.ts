import { createClient } from "@/lib/supabase/server";
import {
  generateAutoBudgets,
  detectSubscriptions,
  checkBudgetWarnings,
  analyzeSpendingBehavior,
} from "@/actions/smart-features";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [budgets, subscriptions, warnings, behavior] = await Promise.all([
      generateAutoBudgets(user.id),
      detectSubscriptions(user.id),
      checkBudgetWarnings(user.id),
      analyzeSpendingBehavior(user.id),
    ]);

    return NextResponse.json({
      autoBudgets: budgets,
      subscriptions,
      budgetWarnings: warnings,
      behaviorInsights: behavior,
    });
  } catch (error) {
    console.error("Smart features error:", error);
    return NextResponse.json(
      { error: "Error al ejecutar análisis inteligente" },
      { status: 500 }
    );
  }
}
