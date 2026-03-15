import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

export default async function SubscriptionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*, category:categories(name, icon, color)")
    .eq("user_id", user.id)
    .order("is_active", { ascending: false })
    .order("amount", { ascending: false });

  const activeSubscriptions = subscriptions?.filter((s) => s.is_active) || [];
  const monthlyTotal = activeSubscriptions.reduce((sum, s) => {
    if (s.frequency === "yearly") return sum + Number(s.amount) / 12;
    if (s.frequency === "weekly") return sum + Number(s.amount) * 4;
    if (s.frequency === "biweekly") return sum + Number(s.amount) * 2;
    return sum + Number(s.amount);
  }, 0);

  const yearlyTotal = monthlyTotal * 12;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suscripciones</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeSubscriptions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(monthlyTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total anual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(yearlyTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cobros recurrentes detectados</CardTitle>
        </CardHeader>
        <CardContent>
          {!subscriptions || subscriptions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RotateCcw className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No se han detectado suscripciones aún.</p>
              <p className="text-sm mt-1">Se detectarán automáticamente cuando haya suficientes datos.</p>
            </div>
          ) : (
            <div className="divide-y">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center gap-4 py-4">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm shrink-0"
                    style={{ backgroundColor: `${sub.category?.color || "#6366f1"}20` }}
                  >
                    {sub.category?.icon || "🔄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{sub.merchant}</p>
                      <Badge variant={sub.is_active ? "default" : "secondary"} className="text-[10px]">
                        {sub.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {sub.frequency === "monthly" ? "Mensual" :
                       sub.frequency === "yearly" ? "Anual" :
                       sub.frequency === "weekly" ? "Semanal" : "Quincenal"}
                      {sub.next_expected_date && ` · Próximo cobro: ${formatDate(sub.next_expected_date)}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatCurrency(Number(sub.amount), sub.currency)}
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
