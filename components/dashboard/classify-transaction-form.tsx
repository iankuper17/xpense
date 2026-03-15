"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";

export function ClassifyTransactionForm({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  async function handleSubmit() {
    if (!response.trim()) return;

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("unclassified_transactions")
      .update({
        user_response: response.trim(),
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (error) {
      toast({ title: "Error", description: "No se pudo clasificar.", variant: "destructive" });
    } else {
      toast({ title: "Listo", description: "Transacción clasificada." });
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="¿Qué fue este pago?"
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        disabled={loading}
      />
      <Button size="icon" onClick={handleSubmit} disabled={loading || !response.trim()}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}
