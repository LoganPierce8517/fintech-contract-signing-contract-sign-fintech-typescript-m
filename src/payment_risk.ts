export type PaymentEvent = {
  id: string;
  amountCents: number;
  status: "settled" | "refunded" | "chargeback";
};

export type SigningDecision = {
  action: "sign" | "hold";
  notification: string;
};

export function decideSigning(event: PaymentEvent): SigningDecision {
  if (event.status === "settled") {
    return { action: "sign", notification: `payment ${event.id} settled; signing approved` };
  }
  return { action: "hold", notification: `payment ${event.id} requires review before signing` };
}
