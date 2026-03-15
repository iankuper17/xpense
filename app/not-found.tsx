import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-semibold">Página no encontrada</h2>
        <p className="text-muted-foreground">
          La página que buscas no existe.
        </p>
        <Link href="/dashboard">
          <Button>Ir al dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
