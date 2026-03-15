const SENDER_KEYWORDS = [
  "banco", "bank", "noreply", "pagos", "payments",
  "factura", "invoice", "receipt", "comprobante",
  "notificacion", "alerta", "alert",
];

const SUBJECT_KEYWORDS = [
  "transacción", "transaccion", "compra", "pago",
  "débito", "debito", "crédito", "credito", "cargo",
  "receipt", "invoice", "payment", "charged", "deducted",
  "retiro", "depósito", "deposito", "transferencia",
  "estado de cuenta", "movimiento",
];

export function shouldProcessEmail(
  from: string,
  subject: string
): boolean {
  const fromLower = from.toLowerCase();
  const subjectLower = subject.toLowerCase();

  const senderMatch = SENDER_KEYWORDS.some((keyword) =>
    fromLower.includes(keyword)
  );

  const subjectMatch = SUBJECT_KEYWORDS.some((keyword) =>
    subjectLower.includes(keyword)
  );

  return senderMatch || subjectMatch;
}

export function buildGmailQuery(afterDate: string): string {
  const senderPart = SENDER_KEYWORDS.map((k) => `from:${k}`).join(" OR ");
  const subjectPart = SUBJECT_KEYWORDS.map((k) => `subject:${k}`).join(" OR ");
  return `(${senderPart} OR ${subjectPart}) after:${afterDate}`;
}

export function getDateForRange(range: string): string {
  const now = new Date();
  switch (range) {
    case "current_month":
      return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/01`;
    case "1_month": {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    }
    case "2_months": {
      const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    }
    case "3_months": {
      const d = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    }
    default:
      return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/01`;
  }
}
