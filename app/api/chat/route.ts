import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { sanitizeInput, formatCurrency } from "@/lib/utils";

async function getFinancialContext(supabase: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const [
    { data: transactions },
    { data: budgets },
    { data: subscriptions },
    { count: alertCount },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, transaction_type, category:categories(name)")
      .eq("user_id", userId)
      .gte("date", startOfMonth),
    supabase
      .from("budgets")
      .select("amount_limit, category:categories(name)")
      .eq("user_id", userId)
      .eq("month", now.getMonth() + 1)
      .eq("year", now.getFullYear()),
    supabase
      .from("subscriptions")
      .select("merchant, amount, frequency")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("fraud_alerts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_resolved", false),
  ]);

  // Calculate totals by category
  const categoryTotals = new Map<string, number>();
  let totalExpenses = 0;
  let totalIncome = 0;

  transactions?.forEach((tx) => {
    const amount = Number(tx.amount);
    if (tx.transaction_type === "expense") {
      totalExpenses += amount;
      const catName = (tx.category as unknown as { name: string } | null)?.name || "Sin categoría";
      categoryTotals.set(catName, (categoryTotals.get(catName) || 0) + amount);
    } else if (tx.transaction_type === "income") {
      totalIncome += amount;
    }
  });

  let context = `Resumen financiero del usuario para ${now.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}:\n`;
  context += `- Gastos totales: ${formatCurrency(totalExpenses)}\n`;
  context += `- Ingresos totales: ${formatCurrency(totalIncome)}\n`;
  context += `- Balance: ${formatCurrency(totalIncome - totalExpenses)}\n\n`;

  if (categoryTotals.size > 0) {
    context += "Gastos por categoría:\n";
    categoryTotals.forEach((amount, category) => {
      context += `- ${category}: ${formatCurrency(amount)}\n`;
    });
    context += "\n";
  }

  if (budgets && budgets.length > 0) {
    context += "Presupuestos activos:\n";
    budgets.forEach((b) => {
      const catName = (b.category as unknown as { name: string } | null)?.name || "Sin categoría";
      context += `- ${catName}: límite ${formatCurrency(Number(b.amount_limit))}\n`;
    });
    context += "\n";
  }

  if (subscriptions && subscriptions.length > 0) {
    const subsTotal = subscriptions.reduce((sum, s) => sum + Number(s.amount), 0);
    context += `Suscripciones activas (${subscriptions.length}): total ${formatCurrency(subsTotal)}/mes\n`;
    subscriptions.forEach((s) => {
      context += `- ${s.merchant}: ${formatCurrency(Number(s.amount))} (${s.frequency})\n`;
    });
    context += "\n";
  }

  if (alertCount && alertCount > 0) {
    context += `Alertas de fraude activas: ${alertCount}\n`;
  }

  return context;
}

const SYSTEM_PROMPT = `Eres un asistente financiero personal inteligente llamado Xpense AI. Tu único propósito es ayudar al usuario con información sobre sus finanzas personales registradas en Xpense.

Reglas estrictas:
1. Solo responde preguntas relacionadas con las finanzas del usuario.
2. Si te preguntan algo fuera del contexto financiero, responde exactamente: "Solo puedo ayudarte con información sobre tus finanzas en Xpense."
3. Sé conciso, claro y útil.
4. Usa formato de moneda mexicana (MXN) por defecto.
5. Si detectas patrones preocupantes, menciónalos proactivamente.
6. Responde siempre en español.
7. No inventes datos. Solo usa la información proporcionada en el contexto.`;

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Rate limiting
    const { success } = rateLimit(`chat:${user.id}`);
    if (!success) {
      return NextResponse.json(
        { error: "Demasiados mensajes. Espera un momento antes de intentar de nuevo." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const message = sanitizeInput(body.message || "");

    if (!message) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    }

    // Get financial context
    const financialContext = await getFinancialContext(supabase, user.id);

    // Get recent chat history
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const chatHistory = (history || []).reverse().map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Call OpenAI
    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nContexto financiero actual del usuario:\n${financialContext}` },
        ...chatHistory,
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const assistantContent = completion.choices[0]?.message?.content || "Lo siento, no pude generar una respuesta.";

    // Save both messages
    const { data: userMsg } = await supabase
      .from("chat_messages")
      .insert({ user_id: user.id, role: "user", content: message })
      .select()
      .single();

    const { data: assistantMsg } = await supabase
      .from("chat_messages")
      .insert({ user_id: user.id, role: "assistant", content: assistantContent })
      .select()
      .single();

    return NextResponse.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Error al procesar tu mensaje. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
