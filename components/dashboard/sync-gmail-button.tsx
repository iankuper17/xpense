"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SyncGmailButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      const res = await fetch("/api/emails/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyRange: "current_month" }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Sincronización completa",
          description: `Se procesaron ${data.processed} transacciones de ${data.total} correos.`,
        });
        router.refresh();
      } else {
        toast({ title: "Error", description: "No se pudo sincronizar.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSync} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
    </Button>
  );
}
