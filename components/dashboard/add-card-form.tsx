"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";

const COLORS = [
  "#6366f1", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#a855f7", "#ec4899",
];

export function AddCardForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  async function handleSubmit() {
    if (!name.trim() || lastFour.length !== 4) {
      toast({ title: "Error", description: "Completa todos los campos correctamente.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({ title: "Error", description: "No se pudo verificar tu sesión.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("cards").insert({
      user_id: user.id,
      name: name.trim(),
      last_four: lastFour,
      color,
    });

    if (error) {
      toast({ title: "Error", description: "No se pudo agregar la tarjeta.", variant: "destructive" });
    } else {
      toast({ title: "Listo", description: "Tarjeta agregada correctamente." });
      setOpen(false);
      setName("");
      setLastFour("");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Agregar tarjeta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarjeta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre de la tarjeta</Label>
            <Input
              placeholder="Ej: BBVA Oro"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Últimos 4 dígitos</Label>
            <Input
              placeholder="1234"
              maxLength={4}
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    color === c ? "border-white scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
