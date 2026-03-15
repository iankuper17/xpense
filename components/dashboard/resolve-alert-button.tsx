"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";

export function ResolveAlertButton({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleResolve() {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("fraud_alerts")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", alertId);

    if (error) {
      toast({ title: "Error", description: "No se pudo resolver la alerta.", variant: "destructive" });
    } else {
      toast({ title: "Listo", description: "Alerta resuelta." });
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleResolve} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
      Resolver
    </Button>
  );
}
