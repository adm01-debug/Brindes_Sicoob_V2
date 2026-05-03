# Inventário Visual de Skins — Skins Factory

> A plataforma utiliza o sistema **Skins Factory** para aplicar identidades visuais profundas sem cores hardcoded.

## 1. Categorias de Skins

### 🟢 Categoria: Classic
Skins focadas em elegância e conformidade institucional.
- **Sicoob (💚):** Cores oficiais, verde e turquesa vivo.
- **Púrpure (💜):** Roxo vibrante e moderno.
- **Esmeralda (💎):** Verde sofisticado com tons de joia.
- **Sunset (🌅):** Paleta quente de laranja e vermelho.
- **Rosé (🌸):** Elegante e focado no público corporativo premium.
- **Minimal (⚪):** Interface clean, tons de cinza e branco.
- **Oceano (🌊):** Azul profundo e sereno.
- **Âmbar (✨):** Dourado premium para coleções exclusivas.
- **Cyber (🤖):** Neon futurista (Ciano/Magenta).
- **Diversity (🏳️‍🌈):** Paleta Pride com gradientes arco-íris dinâmicos.

### 🦈 Categoria: Opera GX Edition (Neon/Gamer Tech)
Skins inspiradas no navegador Opera GX, focadas em alta intensidade visual e "Neon Glow".
- **GX Classic:** Vermelho neon assinatura.
- **Pink Addiction:** Rosa intenso.
- **Purple Haze:** Roxo profundo psicodélico.
- **Rose Quartz:** Rosa cristalino.
- **Ultraviolet:** Violeta UV vibrante.
- **Hackerman:** Verde Matrix.
- **Frutti di Mare:** Azul-petróleo profundo.
- **Cyberpunk:** Amarelo Night City.
- **Razer:** Verde RGB Razer Chroma.

## 2. Tecnologias de Deep Theming
As skins não trocam apenas cores, elas alteram comportamentos visuais:
- **`borderRadius`:** Skins GX aplicam `10px` para um visual mais técnico.
- **`font`:** Skins GX trocam para a família **Inter** (estilo tech Cloudflare).
- **`applyGxNeonGlow`:** Boost de alpha nas sombras coloridas para efeito neon.
- **`applyGxGlass`:** Transparência de "vidro" tingida pela cor primária.
- **`applyGxDarkSurfaces`:** Fundo roxo escuro `#251F33` icônico do Opera GX.

## 3. Cobertura de Tokens
O sistema atinge **100% de cobertura**, garantindo que nenhum elemento (incluindo overlays de voz, chats e painéis técnicos) use cores fora do preset ativo via `var(--primary)`.

---
*Atualizado em 2026-05-03.*
