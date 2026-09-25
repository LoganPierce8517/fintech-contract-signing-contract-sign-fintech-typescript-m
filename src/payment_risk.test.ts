import assert from "node:assert/strict";
import test from "node:test";
import { decideSigning } from "./payment_risk.js";

test("a chargeback holds the contract and records a review notification", () => {
  const result = decideSigning({ id: "pay_204", amountCents: 125000, status: "chargeback" });
  assert.deepEqual(result, {
    action: "hold",
    notification: "payment pay_204 requires review before signing"
  });
});
