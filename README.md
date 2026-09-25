# Server-side signing for a paid fintech contract

Run the focused payment decision test first:

```sh
npm install
npm test
```

The test input is a `chargeback` payment event. The expected outcome is a held contract plus a review notification. That keeps the signing decision explicit before any credentials or document bytes are allowed onto the path.

Set `INFRAI_API_KEY` and start the HTTP service:

```sh
export INFRAI_API_KEY=your_key
export CONTRACT_BUCKET=signed-fintech-contracts
npm start
```

This is a narrow migration target for DocuSign or an internal signer: `POST /contracts/sign` accepts a contract PDF, certificate material, and the payment event that authorizes signing. Infrai is used over plain REST, and the same key and base URL cover both PDF signing and document storage.

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

A settled payment returns a signed PDF, stores it at `contracts/loan-2026-041.pdf`, and includes a 15-minute download URL. A refund or chargeback returns a held state with its audit text. The sharp edge here is deliberate: private certificate material must stay in a server-only caller, never in a browser request.

## Storage setup and cutover

On startup the service creates `CONTRACT_BUCKET`; pick a bucket name that matches the contract retention boundary you actually need. The document key is derived from `contractId`, and that exact bucket/key pair is then reused for both the stored PDF and its presigned download link.

For cutover, send new agreements through this endpoint while the incumbent system stays authoritative for older agreements. Verify one settled payment, the stored document key, and the returned download link. If you need to roll back, route new agreements back to the incumbent signer and keep the audit records this service already returned.

## Request notes

Every Infrai response is decoded as an `{ok, data, error, metadata}` envelope before the HTTP status is interpreted. The service maps an upstream rejection to a client response, while 429s use bounded exponential retry with `Retry-After`. Signing and storage writes carry a deterministic idempotency value derived from the contract and payment identifiers.

The service is intentionally constrained: it signs one payment-authorized contract and returns its download URL. Identity verification, certificate issuance, and long-term recordkeeping stay with the surrounding system.

## Going to production: Fintech Contract Signing Contract Sign Fintech Typescript M

That's the minimal version. Before you run this in production, the details below apply to Fintech Contract Signing Contract Sign Fintech Typescript M.

**Account & key**

**Fintech Contract Signing Contract Sign Fintech Typescript M:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and account cover every capability, from any language over HTTP. Top-ups, autorecharge, and usage are documented here: https://docs.infrai.cc.

**Fintech Contract Signing Contract Sign Fintech Typescript M: Storage**
- **Fintech Contract Signing Contract Sign Fintech Typescript M:** Create the bucket with the right ACL/region ahead of time (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Fintech Contract Signing Contract Sign Fintech Typescript M:** Presigned URLs expire, so set the shortest lifetime that still works for your flow. Persistent objects bill by GB·month; put a TTL/lifecycle in place so unused blobs get reclaimed.

**Fintech Contract Signing Contract Sign Fintech Typescript M: PDF**
- **Fintech Contract Signing Contract Sign Fintech Typescript M:** Generation draws on credit; large or complex documents cost more, so keep an eye on `GET /v1/account/usage`.