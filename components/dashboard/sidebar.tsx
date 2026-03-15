"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  PiggyBank,
  RotateCcw,
  AlertTriangle,
  MessageSquare,
  Settings,
  Wallet,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { logout } from "@/actions/auth";

const navItems = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/dashboard/cards", label: "Tarjetas", icon: CreditCard },
  { href: "/dashboard/budgets", label: "Presupuestos", icon: PiggyBank },
  { href: "/dashboard/subscriptions", label: "Suscripciones", icon: RotateCcw },
  { href: "/dashboard/alerts", label: "Alertas", icon: AlertTriangle },
  { href: "/dashboard/chat", label: "Chat IA", icon: MessageSquare },
  { href: "/dashboard/settings/accounts", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b">
            <Wallet className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">Xpense</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="border-t p-3">
            <form action={logout}>
              <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" type="submit">
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
