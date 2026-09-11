import { ArrowUpRight, Gift, Layers3, MapPin } from "lucide-react";

/** Apresentação do portal sem indicadores comerciais ou certificações presumidos. */
export function AuthBrandingPanel() {
  return (
    <aside className="relative hidden min-h-screen w-[48%] flex-col overflow-hidden bg-[#003641] px-12 py-12 text-white lg:flex xl:px-20" aria-label="Portal de brindes para cooperativas Sicoob">
      <img src="/brand/sicoob-logo.png" alt="Sicoob" width={224} height={50} className="relative z-10 h-auto w-56" />
      <div className="relative z-10 my-auto py-16">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#C9D200]">Compras institucionais</p>
        <h2 className="max-w-lg font-display text-4xl font-semibold leading-[1.12] tracking-tight xl:text-5xl">
          Cada encontro merece<br />uma boa lembrança.
        </h2>
        <p className="mt-6 max-w-md text-base leading-relaxed text-white/80">
          Brindes para aproximar sua cooperativa das pessoas. Reúna a escolha dos produtos e o acompanhamento das compras em um só lugar.
        </p>
        <div className="mt-12 border-t border-white/20 pt-8">
          <p className="mb-5 text-xs uppercase tracking-[0.16em] text-white/65">Do planejamento à entrega</p>
          <ul className="space-y-5">
            {[
              { icon: Gift, title: "Encontre o brinde certo", text: "Consulte produtos, valores e disponibilidade." },
              { icon: Layers3, title: "Organize sua compra", text: "Prepare orçamentos para as ações da cooperativa." },
              { icon: MapPin, title: "Acompanhe cada pedido", text: "Veja o andamento das suas solicitações." },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#00AE9D]"><Icon size={20} aria-hidden="true" /></span>
                <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm leading-relaxed text-white/75">{text}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-3 text-xs text-white/65"><ArrowUpRight size={16} aria-hidden="true" />Pensado para cooperativas e pontos de atendimento.</div>
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-28 size-96 rounded-full border-[64px] border-white/[0.03]" />
    </aside>
  );
}
