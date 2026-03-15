import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AlertTriangle, HelpCircle, ShieldAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResolveAlertButton } from "@/components/dashboard/resolve-alert-button";
import { ClassifyTransactionForm } from "@/components/dashboard/classify-transaction-form";

export default async function AlertsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: fraudAlerts },
    { data: unclassified },
    { data: notifications },
  ] = await Promise.all([
    supabase
      .from("fraud_alerts")
      .select("*, transaction:transactions(amount, merchant, date, currency)")
      .eq("user_id", user.id)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("unclassified_transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Mark notifications as read
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Alertas</h1>

      <Tabs defaultValue="fraud">
        <TabsList>
          <TabsTrigger value="fraud" className="gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            Fraude ({fraudAlerts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="unclassified" className="gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            Sin clasificar ({unclassified?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            Notificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fraud" className="mt-4">
          {!fraudAlerts || fraudAlerts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay alertas de fraude activas.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {fraudAlerts.map((alert) => (
                <Card key={alert.id} className="border-destructive/50">
                  <CardContent className="flex items-start gap-4 p-4">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {alert.transaction?.merchant || "Transacción sospechosa"}
                        </p>
                        {alert.transaction && (
                          <span className="text-sm font-semibold text-destructive">
                            {formatCurrency(Number(alert.transaction.amount), alert.transaction.currency)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.reason}</p>
                      {alert.transaction?.date && (
                        <p className="text-xs text-muted-foreground">{formatDate(alert.transaction.date)}</p>
                      )}
                    </div>
                    <ResolveAlertButton alertId={alert.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="unclassified" className="mt-4">
          {!unclassified || unclassified.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay transacciones pendientes de clasificar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {unclassified.map((tx) => (
                <Card key={tx.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {tx.merchant || tx.email_subject || "Transacción desconocida"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.date ? formatDate(tx.date) : "Fecha desconocida"}
                          {tx.amount ? ` · ${formatCurrency(Number(tx.amount), tx.currency)}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {Math.round(Number(tx.confidence) * 100)}% confianza
                      </Badge>
                    </div>
                    <ClassifyTransactionForm transactionId={tx.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          {!notifications || notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <p>No hay notificaciones.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <Card key={notif.id} className={notif.is_read ? "opacity-60" : ""}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                      notif.type === "fraud" ? "bg-destructive" :
                      notif.type === "budget_warning" ? "bg-yellow-500" :
                      notif.type === "import_complete" ? "bg-green-500" :
                      "bg-primary"
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notif.title}</p>
                      <p className="text-sm text-muted-foreground">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(notif.created_at)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
