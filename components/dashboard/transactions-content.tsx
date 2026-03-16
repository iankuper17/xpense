"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { TransactionFilters } from "@/components/transactions/transaction-filters";

interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  user_id: string | null;
  is_system: boolean;
  created_at: string;
}

interface CardInfo {
  id: string;
  name: string;
  last_four: string;
  color: string;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  date: string;
  merchant: string;
  transaction_type: string;
  confidence: number;
  confirmed_by_user: boolean;
  needs_review: boolean;
  category: CategoryInfo | null;
  card: CardInfo | null;
}

interface TransactionsData {
  transactions: Transaction[];
  categories: CategoryInfo[];
}

function fmt(amount: number, currency = "MXN"): string {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: currency || "MXN" }).format(amount || 0);
  } catch {
    return `$${(amount || 0).toFixed(2)}`;
  }
}

function fmtDate(date: string): string {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat("es-MX", { year: "numeric", month: "short", day: "numeric" }).format(new Date(date));
  } catch {
    return date;
  }
}

export function TransactionsContent() {
  const [data, setData] = useState<TransactionsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transactions/data")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg font-medium">Error al cargar transacciones</p>
        <p className="text-sm mt-1">{error || "Sin datos"}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-primary underline">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transacciones</h1>
      </div>

      <TransactionFilters categories={data.categories} />

      <Card>
        <CardContent className="p-0">
          {data.transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay transacciones registradas aún.</p>
              <p className="text-sm mt-1">Conecta tu Gmail para importar automáticamente.</p>
            </div>
          ) : (
            <div className="divide-y">
              {data.transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm shrink-0"
                    style={{ backgroundColor: `${tx.category?.color || "#6366f1"}20` }}
                  >
                    {tx.category?.icon || "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{tx.merchant}</p>
                      {tx.needs_review && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Revisar
                        </Badge>
                      )}
                      {!tx.confirmed_by_user && tx.confidence < 0.85 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {Math.round(tx.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{fmtDate(tx.date)}</span>
                      {tx.category && <span>· {tx.category.name}</span>}
                      {tx.card && <span>· ****{tx.card.last_four}</span>}
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
                    {fmt(tx.amount, tx.currency)}
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
