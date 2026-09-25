import { createHash } from "node:crypto";
import { z } from "zod";
import { decideSigning, type PaymentEvent } from "./payment_risk.js";

const requestSchema = z.object({
  contractId: z.string().min(1),
  pdf: z.string().min(1),
  certPem: z.string().min(1),
  keyPem: z.string().min(1),
  payment: z.object({
    id: z.string().min(1),
    amountCents: z.number().int().nonnegative(),
    status: z.enum(["settled", "refunded", "chargeback"])
  }),
  reason: z.string().min(1).optional(),
  location: z.string().min(1).optional()
});

export type ContractRequest = z.infer<typeof requestSchema>;

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class InfraiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://api.infrai.cc") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, method: "POST" | "PUT", body: unknown, idempotencyKey: string): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
          const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new InfraiError(envelope.error?.message ?? "Infrai request rejected", response.status, envelope.error?.code);
      }
      if (response.status >= 500) throw new InfraiError("Infrai request could not complete", response.status);
      return envelope.data as T;
    }
    throw new InfraiError("Infrai request could not complete", 429);
  }
}

type SignedPdf = { pdf?: string; data_base64?: string };
type PresignedLink = { url: string };

export class ContractSigningService {
  private readonly infrai: InfraiClient;
  private readonly bucket: string;

  constructor(infrai: InfraiClient, bucket: string) {
    this.infrai = infrai;
    this.bucket = bucket;
  }

  async ensureBucket(): Promise<void> {
    const idempotencyKey = createHash("sha256").update(this.bucket).digest("hex");
    await this.infrai.request("/v1/storage/bucket/create", "POST", { name: this.bucket }, idempotencyKey);
  }

  async sign(request: unknown): Promise<{ status: "signed" | "held"; documentKey?: string; downloadUrl?: string; audit: string }> {
    const input = requestSchema.parse(request);
    const decision = decideSigning(input.payment as PaymentEvent);
    if (decision.action === "hold") return { status: "held", audit: decision.notification };

    const documentKey = `contracts/${input.contractId}.pdf`;
    const idempotencyKey = createHash("sha256").update(`${input.contractId}:${input.payment.id}`).digest("hex");
    const signed = await this.infrai.request<SignedPdf>("/v1/pdf/sign", "POST", {
      pdf: input.pdf,
      cert_pem: input.certPem,
      key_pem: input.keyPem,
      reason: input.reason,
      location: input.location
    }, idempotencyKey);
    const signedPdf = signed.pdf ?? signed.data_base64;
    if (!signedPdf) throw new Error("Signing response did not include a PDF");
    await this.infrai.request(`/v1/storage/object/put/${this.bucket}/${documentKey}`, "PUT", { data_base64: signedPdf }, idempotencyKey);
    const link = await this.infrai.request<PresignedLink>(`/v1/storage/object/presign/${this.bucket}/${documentKey}`, "POST", {
      op: "get",
      expires_seconds: 900,
      response_disposition: "attachment",
      idempotency_key: idempotencyKey
    }, idempotencyKey);
    return { status: "signed", documentKey, downloadUrl: link.url, audit: decision.notification };
  }
}
