export type TransactionType = "expense" | "income" | "refund";
export type ChatRole = "user" | "assistant";
export type NotificationType = "fraud" | "budget_warning" | "unclassified" | "import_complete" | "general";
export type SubscriptionFrequency = "weekly" | "biweekly" | "monthly" | "yearly";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}

export interface GmailAccount {
  id: string;
  user_id: string;
  email: string;
  access_token_secret_id: string | null;
  refresh_token_secret_id: string | null;
  token_expiry: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  user_id: string;
  name: string;
  last_four: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string;
  color: string;
  is_system: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  date: string;
  time: string | null;
  merchant: string | null;
  category_id: string | null;
  card_id: string | null;
  gmail_account_id: string | null;
  transaction_type: TransactionType;
  confidence: number;
  confirmed_by_user: boolean;
  needs_review: boolean;
  email_subject: string | null;
  email_message_id: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  card?: Card;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount_limit: number;
  month: number;
  year: number;
  is_auto_generated: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  spent?: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  merchant: string;
  amount: number;
  currency: string;
  frequency: SubscriptionFrequency;
  is_active: boolean;
  last_charge_date: string | null;
  next_expected_date: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface FraudAlert {
  id: string;
  user_id: string;
  transaction_id: string | null;
  reason: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  transaction?: Transaction;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface UnclassifiedTransaction {
  id: string;
  user_id: string;
  amount: number | null;
  currency: string;
  date: string | null;
  merchant: string | null;
  email_subject: string | null;
  email_snippet: string | null;
  email_message_id: string | null;
  gmail_account_id: string | null;
  confidence: number;
  user_response: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AIExtractionResult {
  amount: number | null;
  currency: string | null;
  date: string | null;
  time: string | null;
  merchant: string | null;
  card_last_four: string | null;
  transaction_type: TransactionType | null;
  confidence: number;
  category_suggestion: string | null;
  is_recurring: boolean;
  fraud_signals: string[];
}
