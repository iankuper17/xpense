"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Wallet,
  RotateCcw,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface CardInfo {
  id: string;
  name: string;
  last_four: string;
}

interface RecentTransaction {
  id: string;
  amount: number;
  currency: string;
  date: string;
  merchant: string;
  transaction_type: string;
  category: CategoryInfo | null;
  card: CardInfo | null;
}

interface DashboardData {
  totalExpenses: number;
  totalIncome: number;
  totalRefunds: number;
  balance: number;
  recentTransactions: RecentTransaction[];
  alertCount: number;
  unclassifiedCount: number;
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

export function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/data")
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
        <p className="text-lg font-medium">Error al cargar el dashboard</p>
        <p className="text-sm mt-1">{error || "Sin datos"}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-primary underline">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Resumen del mes</h1>

      {(data.alertCount > 0 || data.unclassifiedCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {data.alertCount > 0 && (
            <Link href="/dashboard/alerts">
              <Badge variant="destructive" className="gap-1 py-1.5 px-3 cursor-pointer">
                <AlertTriangle className="h-3 w-3" />
                {data.alertCount} alerta{data.alertCount > 1 ? "s" : ""} de fraude
              </Badge>
            </Link>
          )}
          {data.unclassifiedCount > 0 && (
            <Link href="/dashboard/alerts">
              <Badge variant="secondary" className="gap-1 py-1.5 px-3 cursor-pointer">
                {data.unclassifiedCount} transacción{data.unclassifiedCount > 1 ? "es" : ""} sin clasificar
              </Badge>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{fmt(data.totalExpenses)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{fmt(data.totalIncome)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Devoluciones</CardTitle>
            <RotateCcw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">{fmt(data.totalRefunds)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${data.balance >= 0 ? "text-green-500" : "text-destructive"}`}>
              {fmt(data.balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Transacciones recientes</CardTitle>
            <Link href="/dashboard/transactions" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay transacciones aún. Conecta tu Gmail para empezar.
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: `${tx.category?.color || "#6366f1"}20` }}
                    >
                      {tx.category?.icon || "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.merchant}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(tx.date)}
                        {tx.card ? ` · ****${tx.card.last_four}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Presupuestos</CardTitle>
            <Link href="/dashboard/budgets" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay presupuestos configurados. Se generarán automáticamente después del primer mes con datos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
