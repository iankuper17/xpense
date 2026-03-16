export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Wallet,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

function safeCurrency(amount: unknown): string {
  const num = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(num);
  } catch {
    return `$${num.toFixed(2)}`;
  }
}

function safeDate(date: unknown): string {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat("es-MX", { year: "numeric", month: "short", day: "numeric" }).format(new Date(String(date)));
  } catch {
    return String(date);
  }
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

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
    .select("id, amount, date, merchant, transaction_type, category_id, card_id")
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

  // Fetch categories and cards separately to avoid join issues
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon, color")
    .or(`user_id.eq.${user.id},is_system.eq.true`);

  const { data: cards } = await supabase
    .from("cards")
    .select("id, name, last_four")
    .eq("user_id", user.id);

  const catMap = new Map((categories || []).map(c => [c.id, c]));
  const cardMap = new Map((cards || []).map(c => [c.id, c]));

  const totalExpenses = (monthTx || [])
    .filter(t => t.transaction_type === "expense")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const totalIncome = (monthTx || [])
    .filter(t => t.transaction_type === "income")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const totalRefunds = (monthTx || [])
    .filter(t => t.transaction_type === "refund")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const balance = totalIncome - totalExpenses + totalRefunds;
  const alerts = (alertCount || 0);
  const unclassified = (unclassifiedCount || 0);
  const recent = recentTx || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Resumen del mes</h1>

      {(alerts > 0 || unclassified > 0) && (
        <div className="flex flex-wrap gap-3">
          {alerts > 0 && (
            <Link href="/dashboard/alerts">
              <Badge variant="destructive" className="gap-1 py-1.5 px-3 cursor-pointer">
                <AlertTriangle className="h-3 w-3" />
                {alerts} alerta{alerts > 1 ? "s" : ""} de fraude
              </Badge>
            </Link>
          )}
          {unclassified > 0 && (
            <Link href="/dashboard/alerts">
              <Badge variant="secondary" className="gap-1 py-1.5 px-3 cursor-pointer">
                {unclassified} transacción{unclassified > 1 ? "es" : ""} sin clasificar
              </Badge>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{safeCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{safeCurrency(totalIncome)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Devoluciones</CardTitle>
            <RotateCcw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">{safeCurrency(totalRefunds)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-500" : "text-destructive"}`}>
              {safeCurrency(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Transacciones recientes</CardTitle>
            <Link href="/dashboard/transactions" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay transacciones aún. Conecta tu Gmail para empezar.
              </p>
            ) : (
              <div className="space-y-3">
                {recent.map((tx) => {
                  const cat = catMap.get(tx.category_id);
                  const card = cardMap.get(tx.card_id);
                  return (
                    <div key={tx.id} className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sm"
                        style={{ backgroundColor: `${cat?.color || "#6366f1"}20` }}
                      >
                        {cat?.icon || "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {tx.merchant || "Desconocido"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {safeDate(tx.date)}
                          {card ? ` · ****${card.last_four}` : ""}
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
                        {safeCurrency(tx.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Presupuestos</CardTitle>
            <Link href="/dashboard/budgets" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay presupuestos configurados. Se generarán automáticamente después del primer mes con datos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
