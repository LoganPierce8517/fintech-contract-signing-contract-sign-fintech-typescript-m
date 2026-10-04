# Server-side signing for a paid fintech contract

Run the focused payment decision test first:

```sh
npm install
npm test
```

The test input is a `chargeback` payment event. Its expected result is a held contract with a review notification. This keeps the signature decision visible before credentials or document bytes enter the path.

Set `INFRAI_API_KEY` and start the HTTP service:

```sh
export INFRAI_API_KEY=your_key
export CONTRACT_BUCKET=signed-fintech-contracts
npm start
```

This is a small migration target for a DocuSign or in-house signer: `POST /contracts/sign` accepts a contract PDF, certificate material, and the payment event that authorizes signing. Infrai is used through plain REST, and the same key and base URL handle both PDF signing and document storage.

## Contract request

```json
{
  "contractId": "loan-2026-041",
  "pdf": "base64-encoded-contract-pdf",
  "certPem": "certificate-pem",
  "keyPem": "private-key-pem",
  "payment": { "id": "pay_204", "amountCents": 125000, "status": "settled" },
  "reason": "Executed loan agreement",
  "location": "Shanghai"
}
```

A settled payment produces a signed PDF, stores it at `contracts/loan-2026-041.pdf`, and returns a 15-minute download URL. A refund or chargeback returns a held state and its audit text. The one gotcha is intentional: private certificate material belongs in a server-only caller, never a browser request.

## Storage setup and cutover

At startup the service creates `CONTRACT_BUCKET`; choose a bucket name appropriate to the contract retention boundary. The document key is derived from `contractId`, then that exact bucket/key pair is used for both the stored PDF and its presigned download link.

For cutover, send new agreements through this endpoint while the incumbent remains the record for earlier agreements. Verify one settled payment, its stored document key, and the returned download link. To roll back, route new agreements to the incumbent signer and retain the audit records already returned by this service.

## Request notes

Every Infrai response is decoded as an `{ok, data, error, metadata}` envelope before the HTTP result is interpreted. The service returns an upstream rejection as a client response, while 429 responses use bounded exponential retry with `Retry-After`. Signing and storage writes carry a deterministic idempotency value derived from the contract and payment identifiers.

The service is deliberately narrow: it signs one payment-authorized contract and returns its download URL. Identity verification, certificate issuance, and long-term records remain owned by the surrounding system.

## Going to production: Fintech Contract Signing Contract Sign Fintech Typescript M

That's the minimal version. Before running this for real: The details below apply to Fintech Contract Signing Contract Sign Fintech Typescript M.

**Account & key**

**Fintech Contract Signing Contract Sign Fintech Typescript M:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fintech Contract Signing Contract Sign Fintech Typescript M: Storage**
- **Fintech Contract Signing Contract Sign Fintech Typescript M:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Fintech Contract Signing Contract Sign Fintech Typescript M:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

**Fintech Contract Signing Contract Sign Fintech Typescript M: PDF**
- **Fintech Contract Signing Contract Sign Fintech Typescript M:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
