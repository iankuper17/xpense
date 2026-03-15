import { getOpenAIClient } from "./client";
import type { AIExtractionResult } from "@/types/database.types";

const SYSTEM_PROMPT = `Eres un extractor de datos financieros. Analiza el siguiente correo electrónico y extrae ÚNICAMENTE la siguiente información en formato JSON. Si un campo no está disponible con certeza, devuelve null para ese campo. No inventes datos. No asumas. Solo extrae lo que está explícitamente en el correo.

Devuelve exactamente este JSON:
{
  "amount": number | null,
  "currency": "string | null",
  "date": "string | null (formato ISO 8601)",
  "time": "string | null",
  "merchant": "string | null",
  "card_last_four": "string | null",
  "transaction_type": "expense" | "income" | "refund" | null,
  "confidence": number (0 a 1, qué tan seguro estás de la extracción),
  "category_suggestion": "string | null",
  "is_recurring": boolean,
  "fraud_signals": ["string"] (lista vacía si no hay señales)
}`;

export async function extractFinancialData(
  emailSubject: string,
  emailBody: string
): Promise<AIExtractionResult | null> {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Asunto: ${emailSubject}\n\nCuerpo del correo:\n${emailBody}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as AIExtractionResult;
    return parsed;
  } catch (error) {
    console.error("Error extracting financial data:", error);
    return null;
  }
}
