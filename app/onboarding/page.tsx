"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wallet, Mail, CreditCard, Calendar, Loader2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const COLORS = [
  "#6366f1", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#a855f7", "#ec4899",
];

interface CardEntry {
  name: string;
  lastFour: string;
  color: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [gmailConnected] = useState(false);
  const [cards, setCards] = useState<CardEntry[]>([]);
  const [cardName, setCardName] = useState("");
  const [cardLastFour, setCardLastFour] = useState("");
  const [cardColor, setCardColor] = useState(COLORS[0]);
  const [historyRange, setHistoryRange] = useState("current_month");

  const progress = (step / 3) * 100;

  async function connectGmail() {
    setLoading(true);
    try {
      const res = await fetch("/api/gmail/connect", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Error", description: "No se pudo conectar Gmail. Intenta de nuevo.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión. Intenta de nuevo.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function addCard() {
    if (!cardName.trim() || cardLastFour.length !== 4) {
      toast({ title: "Error", description: "Ingresa el nombre y los últimos 4 dígitos.", variant: "destructive" });
      return;
    }
    setCards([...cards, { name: cardName, lastFour: cardLastFour, color: cardColor }]);
    setCardName("");
    setCardLastFour("");
    setCardColor(COLORS[(cards.length + 1) % COLORS.length]);
  }

  function removeCard(index: number) {
    setCards(cards.filter((_, i) => i !== index));
  }

  async function completeOnboarding() {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards, historyRange }),
      });
      if (res.ok) {
        toast({ title: "Listo", description: "Tu cuenta está configurada. Importando correos..." });
        router.push("/dashboard");
      } else {
        toast({ title: "Error", description: "No se pudo completar la configuración.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Wallet className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Xpense</span>
          </div>
          <CardTitle className="text-xl">Configura tu cuenta</CardTitle>
          <CardDescription>Paso {step} de 3</CardDescription>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Mail className="h-12 w-12 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">Conecta tu Gmail</h3>
                <p className="text-sm text-muted-foreground">
                  Conecta tu cuenta de Gmail para extraer automáticamente tus transacciones bancarias.
                </p>
              </div>
              {gmailConnected ? (
                <div className="flex items-center gap-2 justify-center text-green-500">
                  <Check className="h-5 w-5" />
                  <span>Gmail conectado</span>
                </div>
              ) : (
                <Button onClick={connectGmail} className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Conectar Gmail
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!gmailConnected && false}
              >
                {gmailConnected ? "Siguiente" : "Saltar por ahora"}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <CreditCard className="h-12 w-12 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">Registra tus tarjetas</h3>
                <p className="text-sm text-muted-foreground">
                  Agrega tus tarjetas para vincular transacciones automáticamente.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="cardName">Nombre</Label>
                    <Input
                      id="cardName"
                      placeholder="Ej: BBVA Oro"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastFour">Últimos 4 dígitos</Label>
                    <Input
                      id="lastFour"
                      placeholder="1234"
                      maxLength={4}
                      value={cardLastFour}
                      onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Color:</Label>
                  <div className="flex gap-1">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        className={`h-6 w-6 rounded-full border-2 ${cardColor === c ? "border-white" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setCardColor(c)}
                      />
                    ))}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={addCard} className="w-full">
                  Agregar tarjeta
                </Button>
              </div>

              {cards.length > 0 && (
                <div className="space-y-2">
                  {cards.map((card, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-muted">
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: card.color }} />
                      <span className="flex-1 text-sm font-medium">{card.name}</span>
                      <span className="text-sm text-muted-foreground">****{card.lastFour}</span>
                      <button onClick={() => removeCard(i)} className="text-muted-foreground hover:text-destructive text-sm">
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Atrás
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Calendar className="h-12 w-12 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">Rango de historial</h3>
                <p className="text-sm text-muted-foreground">
                  ¿Cuánto historial de correos quieres importar?
                </p>
              </div>

              <Select value={historyRange} onValueChange={setHistoryRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">Este mes</SelectItem>
                  <SelectItem value="1_month">1 mes atrás</SelectItem>
                  <SelectItem value="2_months">2 meses atrás</SelectItem>
                  <SelectItem value="3_months">3 meses atrás</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Atrás
                </Button>
                <Button onClick={completeOnboarding} className="flex-1" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Completar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
