import { describe, expect, it } from "vitest";

import {
  pickEffectivePolicy,
  pickPolicyInForce,
  type ApprovalPolicy,
} from "@/services/sicoob/approvalPolicyService";

const NOW = new Date("2026-11-26T12:00:00.000Z");
const PAST = "2026-01-01T00:00:00.000Z";
const FUTURE = "2027-01-01T00:00:00.000Z";

const policy = (overrides: Partial<ApprovalPolicy> = {}): ApprovalPolicy =>
  ({
    id: "policy-1",
    cooperative_id: null,
    version: "v1",
    is_active: true,
    effective_from: PAST,
    effective_until: null,
    forbid_self_approval: true,
    require_active_membership: true,
    created_at: PAST,
    updated_at: PAST,
    cooperative: null,
    ...overrides,
  }) as ApprovalPolicy;

describe("pickEffectivePolicy", () => {
  it("prefere a versão própria da Singular à global", () => {
    const global = policy({ id: "g", version: "v9" });
    const own = policy({ id: "o", cooperative_id: "coop-1", version: "v1" });

    expect(pickEffectivePolicy([global, own], "coop-1", NOW)).toEqual({
      policy: own,
      inherited: false,
    });
  });

  it("herda a política global quando a Singular não publicou versão própria", () => {
    const global = policy({ id: "g", version: "v9" });

    expect(pickEffectivePolicy([global], "coop-1", NOW)).toEqual({
      policy: global,
      inherited: true,
    });
    expect(pickPolicyInForce([global], "coop-1", NOW)).toBeNull();
  });

  it("cai no padrão técnico quando não há versão própria nem global", () => {
    expect(pickEffectivePolicy([], "coop-1", NOW)).toEqual({ policy: null, inherited: false });
  });

  it("não herda versão agendada para o futuro", () => {
    const agendada = policy({ id: "g", effective_from: FUTURE });

    expect(pickEffectivePolicy([agendada], "coop-1", NOW)).toEqual({
      policy: null,
      inherited: false,
    });
  });

  it("ignora versão encerrada da própria Singular e herda a global", () => {
    const encerrada = policy({ id: "o", cooperative_id: "coop-1", is_active: false });
    const global = policy({ id: "g" });

    expect(pickEffectivePolicy([encerrada, global], "coop-1", NOW)).toEqual({
      policy: global,
      inherited: true,
    });
  });
});
