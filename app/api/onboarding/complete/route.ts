import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  cards: z.array(z.object({
    name: z.string().min(1),
    lastFour: z.string().length(4),
    color: z.string(),
  })),
  historyRange: z.enum(["current_month", "1_month", "2_months", "3_months"]),
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    // Save cards
    if (result.data.cards.length > 0) {
      const cardsToInsert = result.data.cards.map((card) => ({
        user_id: user.id,
        name: card.name,
        last_four: card.lastFour,
        color: card.color,
      }));

      const { error: cardsError } = await supabase
        .from("cards")
        .insert(cardsToInsert);

      if (cardsError) {
        console.error("Cards insert error:", cardsError);
      }
    }

    // Mark onboarding as completed
    await supabase
      .from("users")
      .update({
        onboarding_completed: true,
        onboarding_step: 3,
      })
      .eq("id", user.id);

    // Trigger email import in background (non-blocking)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        historyRange: result.data.historyRange,
      }),
    }).catch((err) => console.error("Background import trigger error:", err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json(
      { error: "Error al completar onboarding" },
      { status: 500 }
    );
  }
}
