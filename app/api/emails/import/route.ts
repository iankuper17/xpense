import { createClient } from "@/lib/supabase/server";
import { importEmails } from "@/actions/process-emails";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Allow both authenticated users and internal calls
    const body = await request.json();
    const userId = user?.id || body.userId;

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const historyRange = body.historyRange || "current_month";
    const result = await importEmails(userId, historyRange);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Email import error:", error);
    return NextResponse.json(
      { error: "Error al importar correos" },
      { status: 500 }
    );
  }
}
