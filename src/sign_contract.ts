import { createServer } from "node:http";
import { ContractSigningService, InfraiClient, InfraiError } from "./contract_signing_service.js";

const apiKey = process.env.INFRAI_API_KEY;
const bucket = process.env.CONTRACT_BUCKET ?? "signed-fintech-contracts";
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const service = new ContractSigningService(new InfraiClient(apiKey), bucket);
await service.ensureBucket();
const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/contracts/sign") {
    response.writeHead(404).end();
    return;
  }
  try {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const result = await service.sign(JSON.parse(raw));
    response.writeHead(result.status === "held" ? 409 : 201, { "Content-Type": "application/json" });
    response.end(JSON.stringify(result));
  } catch (error) {
    const status = error instanceof InfraiError ? error.status : 400;
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request" }));
  }
});

server.listen(3000, () => console.log("contract signer listening on http://localhost:3000"));
