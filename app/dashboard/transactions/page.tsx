export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TransactionFilters } from "@/components/transactions/transaction-filters";

export default async function TransactionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, amount, currency, date, merchant, transaction_type, confidence, confirmed_by_user, needs_review, category_id, card_id")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(100);

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .or(`user_id.eq.${user.id},is_system.eq.true`);

  const { data: cards } = await supabase
    .from("cards")
    .select("id, name, last_four, color")
    .eq("user_id", user.id);

  const catMap = new Map((categories || []).map(c => [c.id, c]));
  const cardMap = new Map((cards || []).map(c => [c.id, c]));

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
              {transactions.map((tx) => {
                const cat = catMap.get(tx.category_id);
                const card = cardMap.get(tx.card_id);
                const confidence = Number(tx.confidence) || 0;
                return (
                  <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm shrink-0"
                      style={{ backgroundColor: `${cat?.color || "#6366f1"}20` }}
                    >
                      {cat?.icon || "📦"}
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
                        {!tx.confirmed_by_user && confidence < 0.85 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {Math.round(confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(tx.date)}</span>
                        {cat && <span>· {cat.name}</span>}
                        {card && <span>· ****{card.last_four}</span>}
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
                      {formatCurrency(Number(tx.amount) || 0, tx.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
