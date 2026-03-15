import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { CreditCard } from "lucide-react";
import { AddCardForm } from "@/components/dashboard/add-card-form";

export default async function CardsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: cards } = await supabase
    .from("cards")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // Get spending per card for current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const { data: cardSpending } = await supabase
    .from("transactions")
    .select("card_id, amount")
    .eq("user_id", user.id)
    .eq("transaction_type", "expense")
    .gte("date", startOfMonth);

  const spendingByCard = new Map<string, number>();
  cardSpending?.forEach((tx) => {
    if (tx.card_id) {
      spendingByCard.set(
        tx.card_id,
        (spendingByCard.get(tx.card_id) || 0) + Number(tx.amount)
      );
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tarjetas</h1>
      </div>

      <AddCardForm />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(!cards || cards.length === 0) ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tienes tarjetas registradas.</p>
            <p className="text-sm mt-1">Agrega una tarjeta para vincular transacciones.</p>
          </div>
        ) : (
          cards.map((card) => (
            <Card key={card.id} className="overflow-hidden">
              <div className="h-2" style={{ backgroundColor: card.color }} />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" style={{ color: card.color }} />
                  {card.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-mono font-bold text-muted-foreground">
                  •••• {card.last_four}
                </p>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">Gasto este mes</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(spendingByCard.get(card.id) || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
