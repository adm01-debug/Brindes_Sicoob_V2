import { createLivenessResponse } from "./contract.ts";

// Esta rota é uma sonda de liveness: não acessa banco, secrets ou serviços externos.
Deno.serve(createLivenessResponse);
