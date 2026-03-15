"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold">Algo salió mal</h2>
        <p className="text-muted-foreground max-w-md">
          Ocurrió un error inesperado. Por favor intenta de nuevo.
        </p>
        <Button onClick={reset}>Reintentar</Button>
      </div>
    </div>
  );
}
