import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApprovalPolicyTab } from "@/pages/admin/sicoob/tabs/ApprovalPolicyTab";
import type {
  ApprovalPolicy,
  PublishPolicyInput,
} from "@/services/sicoob/approvalPolicyService";
import { renderWithProviders } from "../render-helpers";

const { list, listScopes, publish, closeActive } = vi.hoisted(() => ({
  list: vi.fn(),
  listScopes: vi.fn(),
  publish: vi.fn(),
  closeActive: vi.fn(),
}));

vi.mock("@/services/sicoob/approvalPolicyService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/sicoob/approvalPolicyService")>();
  return {
    ...actual,
    sicoobApprovalPolicyService: {
      ...actual.sicoobApprovalPolicyService,
      list,
      listScopes,
      publish,
      closeActive,
    },
  };
});

const pastDate = new Date(Date.now() - 86_400_000).toISOString();

const buildPolicy = (overrides: Partial<ApprovalPolicy> = {}): ApprovalPolicy =>
  ({
    id: "policy-1",
    cooperative_id: "coop-1",
    version: "v2",
    is_active: true,
    effective_from: pastDate,
    effective_until: null,
    forbid_self_approval: true,
    require_active_membership: false,
    created_at: pastDate,
    updated_at: pastDate,
    cooperative: { nome: "SINGULAR TESTE" },
    ...overrides,
  }) as ApprovalPolicy;

const scopes = [
  { cooperativeId: null, cooperativeName: "Todas as Singulares (política global)" },
  { cooperativeId: "coop-1", cooperativeName: "SINGULAR TESTE" },
];

describe("ApprovalPolicyTab", () => {
  beforeEach(() => {
    list.mockReset();
    listScopes.mockReset();
    publish.mockReset();
    closeActive.mockReset();
    list.mockResolvedValue([]);
    listScopes.mockResolvedValue(scopes);
    publish.mockResolvedValue("policy-nova");
    closeActive.mockResolvedValue(undefined);
  });

  it("mostra o padrão do sistema quando nenhuma versão foi publicada", async () => {
    renderWithProviders(<ApprovalPolicyTab />);

    await waitFor(() => expect(screen.getByText("SINGULAR TESTE")).toBeInTheDocument());
    expect(screen.getAllByText("baseline-tecnica-v1")).toHaveLength(2);
    expect(screen.getAllByText("Padrão do sistema")).toHaveLength(2);
    expect(screen.getByText("Nenhuma política publicada")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: /encerrar/i })) {
      expect(button).toBeDisabled();
    }
  });

  it("mostra a versão vigente e as regras em vigor da Singular", async () => {
    list.mockResolvedValue([buildPolicy()]);
    renderWithProviders(<ApprovalPolicyTab />);

    await waitFor(() => expect(screen.getAllByText("v2").length).toBeGreaterThan(1));
    expect(screen.getByText("Ativa")).toBeInTheDocument();
    expect(screen.getAllByText("Bloqueia autoaprovação").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Dispensa vínculo ativo").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Nenhuma política publicada")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /encerrar/i })[1]).toBeEnabled();
  });

  it("publica nova versão com as regras escolhidas", async () => {
    renderWithProviders(<ApprovalPolicyTab />);
    await screen.findAllByText("SINGULAR TESTE");

    fireEvent.click(screen.getAllByRole("button", { name: /publicar versão/i })[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Versão")).toHaveValue("v1");

    fireEvent.click(within(dialog).getByLabelText(/exigir vínculo ativo/i));
    fireEvent.click(within(dialog).getByRole("button", { name: /publicar versão/i }));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining<PublishPolicyInput>({
        cooperativeId: null,
        version: "v1",
        forbidSelfApproval: true,
        requireActiveMembership: false,
      }),
    );
    expect(publish.mock.calls[0][0].effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("encerra a política vigente somente após confirmação", async () => {
    list.mockResolvedValue([buildPolicy()]);
    renderWithProviders(<ApprovalPolicyTab />);
    await screen.findAllByText("SINGULAR TESTE");

    expect(closeActive).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: /encerrar/i })[1]);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /encerrar política/i }));

    await waitFor(() => expect(closeActive).toHaveBeenCalledWith("coop-1"));
  });

  it("avisa quando as políticas não carregam", async () => {
    list.mockRejectedValue(new Error("permissão negada"));
    renderWithProviders(<ApprovalPolicyTab />);

    await waitFor(() =>
      expect(screen.getByText("Não foi possível carregar as políticas")).toBeInTheDocument(),
    );
    expect(screen.getByText("permissão negada")).toBeInTheDocument();
  });

  it("mostra a política global herdada pela Singular sem versão própria", async () => {
    list.mockResolvedValue([
      buildPolicy({
        id: "policy-global",
        cooperative_id: null,
        version: "v9",
        forbid_self_approval: false,
        require_active_membership: true,
      }),
    ]);
    renderWithProviders(<ApprovalPolicyTab />);

    expect(await screen.findByText("Herdada da global")).toBeInTheDocument();
    // Escopo global, Singular que herda e histórico de versões.
    expect(screen.getAllByText("v9")).toHaveLength(3);
    expect(screen.getAllByText("Permite autoaprovação").length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getAllByRole("button", { name: /publicar versão/i })[1]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/bloquear autoaprovação/i)).not.toBeChecked();
    expect(within(dialog).getByLabelText(/exigir vínculo ativo/i)).toBeChecked();
  });

  it("não marca como ativa a versão cuja vigência terminou na troca agendada", async () => {
    const agora = Date.now();
    const anterior = buildPolicy({
      id: "policy-anterior",
      version: "v1",
      is_active: true,
      effective_from: new Date(agora - 7 * 86_400_000).toISOString(),
      effective_until: new Date(agora - 86_400_000).toISOString(),
    });
    const vigente = buildPolicy({
      id: "policy-vigente",
      version: "v2",
      effective_from: new Date(agora - 86_400_000).toISOString(),
    });
    const agendada = buildPolicy({
      id: "policy-agendada",
      version: "v3",
      effective_from: new Date(agora + 7 * 86_400_000).toISOString(),
    });
    list.mockResolvedValue([anterior, vigente, agendada]);

    renderWithProviders(<ApprovalPolicyTab />);

    const historico = (await screen.findByText("Término")).closest("table") as HTMLElement;
    const linha = (versao: string) =>
      within(historico).getByText(versao).closest("tr") as HTMLElement;

    expect(within(linha("v1")).getByText("Encerrada")).toBeInTheDocument();
    expect(within(linha("v2")).getByText("Ativa")).toBeInTheDocument();
    expect(within(linha("v3")).getByText("Agendada")).toBeInTheDocument();
  });

  it("reabre o formulário sugerindo a próxima versão após publicar", async () => {
    list.mockResolvedValue([buildPolicy({ version: "v1" })]);
    publish.mockImplementation(async () => {
      list.mockResolvedValue([
        buildPolicy({ version: "v1", is_active: false, effective_until: pastDate }),
        buildPolicy({ id: "policy-2", version: "v2" }),
      ]);
      return "policy-2";
    });
    renderWithProviders(<ApprovalPolicyTab />);
    await screen.findAllByText("SINGULAR TESTE");

    fireEvent.click(screen.getAllByRole("button", { name: /publicar versão/i })[1]);
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Versão")).toHaveValue("v2");
    fireEvent.click(within(dialog).getByRole("button", { name: /publicar versão/i }));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: /publicar versão/i })[1]);
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Versão")).toHaveValue("v3");
  });
});
