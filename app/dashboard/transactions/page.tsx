import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TransactionFilters } from "@/components/transactions/transaction-filters";

export default async function TransactionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, category:categories(name, icon, color), card:cards(name, last_four, color)")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(100);

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .or(`user_id.eq.${user.id},is_system.eq.true`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transacciones</h1>
      </div>

      <TransactionFilters categories={categories || []} />

      <Card>
        <CardContent className="p-0">
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay transacciones registradas aún.</p>
              <p className="text-sm mt-1">Conecta tu Gmail para importar automáticamente.</p>
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm shrink-0"
                    style={{ backgroundColor: `${tx.category?.color || "#6366f1"}20` }}
                  >
                    {tx.category?.icon || "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {tx.merchant || "Desconocido"}
                      </p>
                      {tx.needs_review && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Revisar
                        </Badge>
                      )}
                      {!tx.confirmed_by_user && tx.confidence < 0.85 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {Math.round(tx.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(tx.date)}</span>
                      {tx.category && <span>· {tx.category.name}</span>}
                      {tx.card && <span>· ****{tx.card.last_four}</span>}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold whitespace-nowrap ${
                      tx.transaction_type === "expense"
                        ? "text-destructive"
                        : tx.transaction_type === "income"
                        ? "text-green-500"
                        : "text-blue-500"
                    }`}
                  >
                    {tx.transaction_type === "expense" ? "-" : "+"}
                    {formatCurrency(Number(tx.amount), tx.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
