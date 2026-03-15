import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/gmail/client";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const url = getAuthUrl();
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Gmail connect error:", error);
    return NextResponse.json(
      { error: "Error al conectar Gmail" },
      { status: 500 }
    );
  }
}
