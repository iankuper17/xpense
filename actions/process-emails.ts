"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getGmailClient } from "@/lib/gmail/client";
import { shouldProcessEmail, buildGmailQuery, getDateForRange } from "@/lib/gmail/filters";
import { extractFinancialData } from "@/lib/openai/extract";
import type { AIExtractionResult } from "@/types/database.types";

async function getTokenFromVault(serviceClient: ReturnType<typeof createServiceClient>, secretId: string): Promise<string | null> {
  const { data, error } = await serviceClient.rpc("vault.read_secret", {
    secret_id: secretId,
  });
  if (error || !data) return null;
  return data;
}

function decodeEmailBody(payload: { parts?: Array<{ mimeType: string; body?: { data?: string } }>; body?: { data?: string } }): string {
  let body = "";

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        body = Buffer.from(part.body.data, "base64url").toString("utf-8");
        break;
      }
    }
  } else if (payload.body?.data) {
    body = Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }

  return body.slice(0, 3000); // Limit to 3000 chars for OpenAI
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

async function checkDuplicate(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  amount: number,
  merchant: string,
  date: string
): Promise<boolean> {
  const { data } = await serviceClient
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("amount", amount)
    .eq("merchant", merchant)
    .eq("date", date)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

async function findOrCreateCategory(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  suggestion: string | null
): Promise<string | null> {
  if (!suggestion) return null;

  const normalized = suggestion.toLowerCase().trim();

  // Try to find existing category
  const { data: existing } = await serviceClient
    .from("categories")
    .select("id, name")
    .or(`user_id.eq.${userId},is_system.eq.true`)
    .ilike("name", `%${normalized}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Create new category
  const { data: newCat } = await serviceClient
    .from("categories")
    .insert({
      user_id: userId,
      name: suggestion,
      icon: "📦",
      color: "#6366f1",
      is_system: false,
    })
    .select("id")
    .single();

  return newCat?.id || null;
}

async function findCardByLastFour(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  lastFour: string | null
): Promise<string | null> {
  if (!lastFour) return null;

  const { data } = await serviceClient
    .from("cards")
    .select("id")
    .eq("user_id", userId)
    .eq("last_four", lastFour)
    .limit(1);

  return data?.[0]?.id || null;
}

async function processExtraction(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  gmailAccountId: string,
  extraction: AIExtractionResult,
  emailSubject: string,
  emailMessageId: string
) {
  // Step 5: Duplicate detection
  if (extraction.amount && extraction.merchant && extraction.date) {
    const isDuplicate = await checkDuplicate(
      serviceClient,
      userId,
      extraction.amount,
      extraction.merchant,
      extraction.date
    );
    if (isDuplicate) {
      console.log("Duplicate transaction detected, skipping");
      return;
    }
  }

  // Step 3: Confidence-based routing
  if (extraction.confidence < 0.6) {
    // Low confidence → unclassified
    await serviceClient.from("unclassified_transactions").insert({
      user_id: userId,
      amount: extraction.amount,
      currency: extraction.currency || "MXN",
      date: extraction.date,
      merchant: extraction.merchant,
      email_subject: emailSubject,
      email_message_id: emailMessageId,
      gmail_account_id: gmailAccountId,
      confidence: extraction.confidence,
    });

    // Notify user
    await serviceClient.from("notifications").insert({
      user_id: userId,
      type: "unclassified",
      title: "Transacción sin clasificar",
      message: `No pudimos clasificar una transacción${extraction.merchant ? ` de ${extraction.merchant}` : ""}. Por favor revísala.`,
    });
    return;
  }

  // Step 4: Category
  const categoryId = await findOrCreateCategory(
    serviceClient,
    userId,
    extraction.category_suggestion
  );

  // Find card
  const cardId = await findCardByLastFour(serviceClient, userId, extraction.card_last_four);

  // Insert transaction
  const { data: transaction } = await serviceClient.from("transactions").insert({
    user_id: userId,
    amount: extraction.amount || 0,
    currency: extraction.currency || "MXN",
    date: extraction.date || new Date().toISOString().split("T")[0],
    time: extraction.time,
    merchant: extraction.merchant,
    category_id: categoryId,
    card_id: cardId,
    gmail_account_id: gmailAccountId,
    transaction_type: extraction.transaction_type || "expense",
    confidence: extraction.confidence,
    confirmed_by_user: false,
    needs_review: extraction.confidence < 0.85,
    email_subject: emailSubject,
    email_message_id: emailMessageId,
  }).select("id").single();

  // Step 6: Fraud detection
  if (extraction.fraud_signals.length > 0 && transaction) {
    await serviceClient.from("fraud_alerts").insert({
      user_id: userId,
      transaction_id: transaction.id,
      reason: extraction.fraud_signals.join("; "),
    });

    await serviceClient.from("notifications").insert({
      user_id: userId,
      type: "fraud",
      title: "Posible fraude detectado",
      message: `Se detectaron señales sospechosas en una transacción${extraction.merchant ? ` de ${extraction.merchant}` : ""}.`,
      metadata: { transaction_id: transaction.id },
    });
  }
}

export async function importEmails(
  userId: string,
  historyRange: string
): Promise<{ processed: number; total: number }> {
  const serviceClient = createServiceClient();

  // Get all gmail accounts for user
  const { data: gmailAccounts } = await serviceClient
    .from("gmail_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!gmailAccounts || gmailAccounts.length === 0) {
    return { processed: 0, total: 0 };
  }

  let totalProcessed = 0;
  let totalEmails = 0;

  for (const account of gmailAccounts) {
    // Get tokens from Vault
    const accessToken = account.access_token_secret_id
      ? await getTokenFromVault(serviceClient, account.access_token_secret_id)
      : null;
    const refreshToken = account.refresh_token_secret_id
      ? await getTokenFromVault(serviceClient, account.refresh_token_secret_id)
      : null;

    if (!accessToken || !refreshToken) continue;

    const gmail = await getGmailClient(accessToken, refreshToken);
    const afterDate = getDateForRange(historyRange);
    const query = buildGmailQuery(afterDate);

    // Fetch message IDs
    let allMessageIds: string[] = [];
    let pageToken: string | undefined;

    do {
      const response = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 100,
        pageToken,
      });

      if (response.data.messages) {
        allMessageIds = allMessageIds.concat(
          response.data.messages.map((m) => m.id!).filter(Boolean)
        );
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    totalEmails += allMessageIds.length;

    // Process in batches of 20
    const BATCH_SIZE = 20;
    for (let i = 0; i < allMessageIds.length; i += BATCH_SIZE) {
      const batch = allMessageIds.slice(i, i + BATCH_SIZE);

      for (const messageId of batch) {
        try {
          const message = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full",
          });

          const headers = message.data.payload?.headers || [];
          const from = getHeader(headers as Array<{ name: string; value: string }>, "From");
          const subject = getHeader(headers as Array<{ name: string; value: string }>, "Subject");

          // Step 1: Filter
          if (!shouldProcessEmail(from, subject)) continue;

          const body = decodeEmailBody(message.data.payload as Parameters<typeof decodeEmailBody>[0]);
          if (!body) continue;

          // Step 2: Extract with AI
          const extraction = await extractFinancialData(subject, body);
          if (!extraction) continue;

          // Steps 3-6: Process extraction
          await processExtraction(
            serviceClient,
            userId,
            account.id,
            extraction,
            subject,
            messageId
          );

          totalProcessed++;
        } catch (error) {
          console.error(`Error processing email ${messageId}:`, error);
        }
      }
    }

    // Update last sync
    await serviceClient
      .from("gmail_accounts")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", account.id);
  }

  // Notify import complete
  await serviceClient.from("notifications").insert({
    user_id: userId,
    type: "import_complete",
    title: "Importación completada",
    message: `Se procesaron ${totalProcessed} transacciones de ${totalEmails} correos.`,
  });

  return { processed: totalProcessed, total: totalEmails };
}
