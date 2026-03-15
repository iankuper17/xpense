import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { PiggyBank } from "lucide-react";
import { AddBudgetForm } from "@/components/dashboard/add-budget-form";

export default async function BudgetsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startOfMonth = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endOfMonth = new Date(year, month, 0).toISOString().split("T")[0];

  const { data: budgets } = await supabase
    .from("budgets")
    .select("*, category:categories(id, name, icon, color)")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year);

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .or(`user_id.eq.${user.id},is_system.eq.true`);

  // Get spending per category for current month
  const { data: spending } = await supabase
    .from("transactions")
    .select("category_id, amount")
    .eq("user_id", user.id)
    .eq("transaction_type", "expense")
    .gte("date", startOfMonth)
    .lte("date", endOfMonth);

  const spendingByCategory = new Map<string, number>();
  spending?.forEach((tx) => {
    if (tx.category_id) {
      spendingByCategory.set(
        tx.category_id,
        (spendingByCategory.get(tx.category_id) || 0) + Number(tx.amount)
      );
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Presupuestos — {new Date(year, month - 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" })}</h1>
      </div>

      <AddBudgetForm categories={categories || []} month={month} year={year} />

      {(!budgets || budgets.length === 0) ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <PiggyBank className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay presupuestos para este mes.</p>
            <p className="text-sm mt-1">Agrega uno manualmente o espera a que se generen automáticamente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map((budget) => {
            const spent = spendingByCategory.get(budget.category?.id || "") || 0;
            const limit = Number(budget.amount_limit);
            const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
            const isWarning = percentage >= 80;
            const isOver = percentage >= 100;

            return (
              <Card key={budget.id} className={isOver ? "border-destructive" : isWarning ? "border-yellow-500/50" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>{budget.category?.icon || "📦"}</span>
                      {budget.category?.name || "Sin categoría"}
                    </span>
                    {budget.is_auto_generated && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Auto</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Gastado</p>
                      <p className={`text-xl font-bold ${isOver ? "text-destructive" : isWarning ? "text-yellow-500" : ""}`}>
                        {formatCurrency(spent)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Límite</p>
                      <p className="text-lg font-semibold text-muted-foreground">
                        {formatCurrency(limit)}
                      </p>
                    </div>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-secondary">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        isOver ? "bg-destructive" : isWarning ? "bg-yellow-500" : "bg-primary"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {Math.round(percentage)}% utilizado · Restante: {formatCurrency(Math.max(limit - spent, 0))}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
