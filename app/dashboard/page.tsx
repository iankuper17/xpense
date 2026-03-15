import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Wallet,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

async function getDashboardData(userId: string) {
  const supabase = createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [
    { data: transactions },
    { data: recentTransactions },
    { count: alertCount },
    { count: unclassifiedCount },
    { data: budgets },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, transaction_type")
      .eq("user_id", userId)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth),
    supabase
      .from("transactions")
      .select("*, category:categories(name, icon, color), card:cards(name, last_four)")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("fraud_alerts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_resolved", false),
    supabase
      .from("unclassified_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_resolved", false),
    supabase
      .from("budgets")
      .select("*, category:categories(name, icon)")
      .eq("user_id", userId)
      .eq("month", now.getMonth() + 1)
      .eq("year", now.getFullYear()),
  ]);

  const totalExpenses = transactions
    ?.filter((t) => t.transaction_type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const totalIncome = transactions
    ?.filter((t) => t.transaction_type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const totalRefunds = transactions
    ?.filter((t) => t.transaction_type === "refund")
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  return {
    totalExpenses,
    totalIncome,
    totalRefunds,
    balance: totalIncome - totalExpenses + totalRefunds,
    recentTransactions: recentTransactions || [],
    alertCount: alertCount || 0,
    unclassifiedCount: unclassifiedCount || 0,
    budgets: budgets || [],
  };
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const data = await getDashboardData(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Resumen del mes</h1>

      {/* Alerts */}
      {(data.alertCount > 0 || data.unclassifiedCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {data.alertCount > 0 && (
            <Link href="/dashboard/alerts">
              <Badge variant="destructive" className="gap-1 py-1.5 px-3 cursor-pointer">
                <AlertTriangle className="h-3 w-3" />
                {data.alertCount} alerta{data.alertCount > 1 ? "s" : ""} de fraude
              </Badge>
            </Link>
          )}
          {data.unclassifiedCount > 0 && (
            <Link href="/dashboard/alerts">
              <Badge variant="secondary" className="gap-1 py-1.5 px-3 cursor-pointer">
                {data.unclassifiedCount} transacción{data.unclassifiedCount > 1 ? "es" : ""} sin clasificar
              </Badge>
            </Link>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(data.totalExpenses)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(data.totalIncome)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Devoluciones</CardTitle>
            <RotateCcw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">{formatCurrency(data.totalRefunds)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${data.balance >= 0 ? "text-green-500" : "text-destructive"}`}>
              {formatCurrency(data.balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Transacciones recientes</CardTitle>
            <Link href="/dashboard/transactions" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay transacciones aún. Conecta tu Gmail para empezar.
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentTransactions.map((tx: Record<string, unknown>) => (
                  <div key={tx.id as string} className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: `${(tx.category as Record<string, string>)?.color || "#6366f1"}20` }}
                    >
                      {(tx.category as Record<string, string>)?.icon || "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {(tx.merchant as string) || "Desconocido"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.date as string)}
                        {tx.card ? ` · ****${String((tx.card as Record<string, string>).last_four)}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        tx.transaction_type === "expense"
                          ? "text-destructive"
                          : tx.transaction_type === "income"
                          ? "text-green-500"
                          : "text-blue-500"
                      }`}
                    >
                      {tx.transaction_type === "expense" ? "-" : "+"}
                      {formatCurrency(tx.amount as number)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budgets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Presupuestos</CardTitle>
            <Link href="/dashboard/budgets" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            {data.budgets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay presupuestos configurados. Se generarán automáticamente después del primer mes con datos.
              </p>
            ) : (
              <div className="space-y-4">
                {data.budgets.slice(0, 4).map((budget: Record<string, unknown>) => {
                  const spent = (budget.spent as number) || 0;
                  const limit = budget.amount_limit as number;
                  const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                  const isWarning = percentage >= 80;

                  return (
                    <div key={budget.id as string} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                            {String((budget.category as Record<string, string>)?.icon || "")}{" "}
                          {String((budget.category as Record<string, string>)?.name || "")}
                        </span>
                        <span className={isWarning ? "text-destructive font-medium" : "text-muted-foreground"}>
                          {formatCurrency(spent)} / {formatCurrency(limit)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isWarning ? "bg-destructive" : "bg-primary"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
