"use server";

import { createServiceClient } from "@/lib/supabase/server";

// ============================================================
// 1. AUTO BUDGETS — Generate suggested budgets based on averages
// ============================================================
export async function generateAutoBudgets(userId: string) {
  const serviceClient = createServiceClient();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Get last 3 months of expense data grouped by category
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const startDate = threeMonthsAgo.toISOString().split("T")[0];

  const { data: expenses } = await serviceClient
    .from("transactions")
    .select("category_id, amount, date")
    .eq("user_id", userId)
    .eq("transaction_type", "expense")
    .gte("date", startDate)
    .not("category_id", "is", null);

  if (!expenses || expenses.length === 0) return { created: 0 };

  // Group spending by category and month
  const categoryMonthly = new Map<string, number[]>();

  expenses.forEach((tx) => {
    const catId = tx.category_id!;
    const txDate = new Date(tx.date);
    const monthKey = `${txDate.getFullYear()}-${txDate.getMonth() + 1}`;

    if (!categoryMonthly.has(catId)) {
      categoryMonthly.set(catId, []);
    }

    const existing = categoryMonthly.get(catId)!;
    // Store as accumulated per unique month
    const monthIndex = existing.findIndex((_, i) => i === 0); // Simple accumulation
    if (monthIndex === -1) {
      existing.push(Number(tx.amount));
    } else {
      existing.push(Number(tx.amount));
    }
  });

  // Calculate averages and create budgets
  let created = 0;
  const budgetsToInsert: Array<{
    user_id: string;
    category_id: string;
    amount_limit: number;
    month: number;
    year: number;
    is_auto_generated: boolean;
  }> = [];

  // Re-aggregate properly: sum per category across all months, then divide by months
  const catTotals = new Map<string, number>();
  expenses.forEach((tx) => {
    const catId = tx.category_id!;
    catTotals.set(catId, (catTotals.get(catId) || 0) + Number(tx.amount));
  });

  // Count distinct months in data
  const monthsSet = new Set(
    expenses.map((tx) => {
      const d = new Date(tx.date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  );
  const numMonths = Math.max(monthsSet.size, 1);

  catTotals.forEach((total, categoryId) => {
    const average = total / numMonths;
    // Add 15% buffer to the average for the budget suggestion
    const suggestedLimit = Math.ceil(average * 1.15 / 100) * 100;

    if (suggestedLimit >= 50) {
      budgetsToInsert.push({
        user_id: userId,
        category_id: categoryId,
        amount_limit: suggestedLimit,
        month: currentMonth,
        year: currentYear,
        is_auto_generated: true,
      });
    }
  });

  if (budgetsToInsert.length > 0) {
    const { data } = await serviceClient
      .from("budgets")
      .upsert(budgetsToInsert, {
        onConflict: "user_id,category_id,month,year",
        ignoreDuplicates: true,
      })
      .select("id");

    created = data?.length || 0;

    if (created > 0) {
      await serviceClient.from("notifications").insert({
        user_id: userId,
        type: "general",
        title: "Presupuestos sugeridos",
        message: `Se crearon ${created} presupuestos automáticos basados en tu historial de gastos.`,
      });
    }
  }

  return { created };
}

// ============================================================
// 2. SUBSCRIPTION DETECTION — Find recurring charges
// ============================================================
export async function detectSubscriptions(userId: string) {
  const serviceClient = createServiceClient();

  // Get all expenses from the last 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const startDate = threeMonthsAgo.toISOString().split("T")[0];

  const { data: expenses } = await serviceClient
    .from("transactions")
    .select("merchant, amount, date, category_id")
    .eq("user_id", userId)
    .eq("transaction_type", "expense")
    .gte("date", startDate)
    .not("merchant", "is", null)
    .order("date", { ascending: true });

  if (!expenses || expenses.length < 2) return { detected: 0 };

  // Group by merchant + amount (same merchant, same amount = potential subscription)
  const groups = new Map<string, Array<{ date: string; category_id: string | null }>>();

  expenses.forEach((tx) => {
    const key = `${tx.merchant!.toLowerCase().trim()}|${Number(tx.amount).toFixed(2)}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push({ date: tx.date, category_id: tx.category_id });
  });

  let detected = 0;

  for (const [key, entries] of Array.from(groups.entries())) {
    if (entries.length < 2) continue;

    // Check if dates are roughly 30 days apart
    const sortedDates = entries
      .map((e) => new Date(e.date).getTime())
      .sort((a, b) => a - b);

    const intervals: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      const diffDays = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
      intervals.push(diffDays);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    let frequency: "weekly" | "biweekly" | "monthly" | "yearly" | null = null;
    if (avgInterval >= 5 && avgInterval <= 10) frequency = "weekly";
    else if (avgInterval >= 12 && avgInterval <= 18) frequency = "biweekly";
    else if (avgInterval >= 25 && avgInterval <= 35) frequency = "monthly";
    else if (avgInterval >= 350 && avgInterval <= 380) frequency = "yearly";

    if (!frequency) continue;

    const [merchant, amountStr] = key.split("|");
    const amount = parseFloat(amountStr);
    const lastDate = new Date(Math.max(...sortedDates));

    // Calculate next expected date
    const daysToAdd = frequency === "weekly" ? 7 :
      frequency === "biweekly" ? 14 :
      frequency === "monthly" ? 30 : 365;
    const nextDate = new Date(lastDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    // Upsert subscription
    const { error } = await serviceClient
      .from("subscriptions")
      .upsert({
        user_id: userId,
        merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
        amount,
        frequency,
        is_active: true,
        last_charge_date: lastDate.toISOString().split("T")[0],
        next_expected_date: nextDate.toISOString().split("T")[0],
        category_id: entries[entries.length - 1].category_id,
      }, {
        onConflict: "user_id,merchant,amount",
        ignoreDuplicates: false,
      });

    if (!error) detected++;
  }

  return { detected };
}

// ============================================================
// 3. BUDGET WARNING CHECK — Alert at 80%
// ============================================================
export async function checkBudgetWarnings(userId: string) {
  const serviceClient = createServiceClient();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startOfMonth = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endOfMonth = new Date(year, month, 0).toISOString().split("T")[0];

  const { data: budgets } = await serviceClient
    .from("budgets")
    .select("id, amount_limit, category_id, category:categories(name)")
    .eq("user_id", userId)
    .eq("month", month)
    .eq("year", year);

  if (!budgets || budgets.length === 0) return { warnings: 0 };

  const { data: expenses } = await serviceClient
    .from("transactions")
    .select("category_id, amount")
    .eq("user_id", userId)
    .eq("transaction_type", "expense")
    .gte("date", startOfMonth)
    .lte("date", endOfMonth);

  const spentByCategory = new Map<string, number>();
  expenses?.forEach((tx) => {
    if (tx.category_id) {
      spentByCategory.set(tx.category_id, (spentByCategory.get(tx.category_id) || 0) + Number(tx.amount));
    }
  });

  let warnings = 0;

  for (const budget of budgets) {
    const spent = spentByCategory.get(budget.category_id) || 0;
    const limit = Number(budget.amount_limit);
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;

    if (percentage >= 80) {
      const catName = (budget.category as unknown as { name: string } | null)?.name || "categoría";

      // Check if we already sent this warning this month
      const { count } = await serviceClient
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "budget_warning")
        .gte("created_at", new Date(year, month - 1, 1).toISOString())
        .like("message", `%${catName}%`);

      if ((count || 0) === 0) {
        await serviceClient.from("notifications").insert({
          user_id: userId,
          type: "budget_warning",
          title: "Presupuesto al límite",
          message: `Has usado el ${Math.round(percentage)}% de tu presupuesto de ${catName}.`,
          metadata: { budget_id: budget.id, percentage: Math.round(percentage) },
        });
        warnings++;
      }
    }
  }

  return { warnings };
}

// ============================================================
// 4. BEHAVIOR ANALYSIS — Spending patterns by hour
// ============================================================
export async function analyzeSpendingBehavior(userId: string) {
  const serviceClient = createServiceClient();

  // Get transactions with time data from last 2 months
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const { data: transactions } = await serviceClient
    .from("transactions")
    .select("amount, time, transaction_type")
    .eq("user_id", userId)
    .eq("transaction_type", "expense")
    .gte("date", twoMonthsAgo.toISOString().split("T")[0])
    .not("time", "is", null);

  if (!transactions || transactions.length < 10) {
    return { insights: [] };
  }

  // Analyze by time of day
  let totalExpenses = 0;
  let nightExpenses = 0; // After 9pm
  let morningExpenses = 0; // 6am - 12pm
  let afternoonExpenses = 0; // 12pm - 6pm
  let eveningExpenses = 0; // 6pm - 9pm

  transactions.forEach((tx) => {
    const hour = parseInt(tx.time!.split(":")[0], 10);
    const amount = Number(tx.amount);
    totalExpenses += amount;

    if (hour >= 21 || hour < 6) nightExpenses += amount;
    else if (hour >= 6 && hour < 12) morningExpenses += amount;
    else if (hour >= 12 && hour < 18) afternoonExpenses += amount;
    else eveningExpenses += amount;
  });

  const insights: string[] = [];

  const nightPct = totalExpenses > 0 ? (nightExpenses / totalExpenses) * 100 : 0;
  if (nightPct > 40) {
    insights.push(
      `El ${Math.round(nightPct)}% de tus gastos ocurren después de las 9PM. Considera si son compras impulsivas.`
    );
  }

  const morningPct = totalExpenses > 0 ? (morningExpenses / totalExpenses) * 100 : 0;
  const afternoonPct = totalExpenses > 0 ? (afternoonExpenses / totalExpenses) * 100 : 0;

  if (morningPct > 50) {
    insights.push(`La mayoría de tus gastos (${Math.round(morningPct)}%) ocurren por la mañana.`);
  }

  if (afternoonPct > 50) {
    insights.push(`La mayoría de tus gastos (${Math.round(afternoonPct)}%) ocurren por la tarde.`);
  }

  // Store insights as notification if any
  if (insights.length > 0) {
    await serviceClient.from("notifications").insert({
      user_id: userId,
      type: "general",
      title: "Análisis de comportamiento",
      message: insights.join(" "),
    });
  }

  return { insights };
}
