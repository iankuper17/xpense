import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Mail, Settings } from "lucide-react";
import { ConnectGmailButton } from "@/components/dashboard/connect-gmail-button";
import { SyncGmailButton } from "@/components/dashboard/sync-gmail-button";

export default async function AccountsSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: gmailAccounts } = await supabase
    .from("gmail_accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Nombre</p>
              <p className="font-medium">{profile?.full_name || "Sin nombre"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Miembro desde</p>
              <p className="font-medium">{formatDate(profile?.created_at || user.created_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gmail Accounts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Cuentas de Gmail conectadas
          </CardTitle>
          <ConnectGmailButton />
        </CardHeader>
        <CardContent>
          {!gmailAccounts || gmailAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tienes cuentas de Gmail conectadas.</p>
              <p className="text-sm mt-1">Conecta una para importar transacciones automáticamente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {gmailAccounts.map((account) => (
                <div key={account.id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{account.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.last_sync_at
                        ? `Última sincronización: ${formatDate(account.last_sync_at)}`
                        : "Sin sincronizar"}
                    </p>
                  </div>
                  <Badge variant={account.is_active ? "default" : "secondary"}>
                    {account.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                  <SyncGmailButton accountId={account.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
