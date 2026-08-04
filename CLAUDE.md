# Torre de Controle do Trigo — Contexto do Projeto (leia antes de qualquer tarefa)

## O que é
Mockup navegável (protótipo de venda, sem backend) do "Hub de Trigo": um Decision Intelligence Hub que recomenda, de forma contínua e explicável, QUANDO comprar, QUANTO, de QUAL origem, com QUAL fornecedor, por QUAL porto, para QUAL moinho, com QUAL blend e QUAL parcela proteger por hedge — otimizando pelo CUSTO TOTAL LANDED ajustado ao risco (não pelo preço nominal). Cliente: M. Dias Branco. Parceria: Monoda × Google Cloud. Público: executivos (CPO/CFO) + times de negócio e TI. Tese central: "Um Único Trigo" — todas as áreas decidindo sobre a mesma verdade.

## Stack e convenções
- Vite + React 18 + TypeScript + Tailwind + React Router + Recharts + lucide-react + framer-motion.
- Componentes funcionais, hooks, TypeScript estrito. Nada de backend: dados vêm SEMPRE de src/data (nenhum número mágico solto em componentes).
- Números com `tabular-nums`. Moeda BRL "R$ 1.480" (pt-BR). Datas em pt-BR.
- Acessibilidade: foco visível, aria-labels em ícones, contraste AA, prefers-reduced-motion.

## Design system v2 (Palantir/Stripe — densidade de dados + elegância)
Princípio: hierarquia por peso, densidade calibrada, movimento que explica, cor como sintaxe. Em cada tela: UMA coisa domina, duas ou três secundárias, o resto é contexto silencioso.

### Superfícies e elevação
- Camadas: `bg-base` #0A101F · `surface-1` #0E1626 (painel: sidebar/topbar) · `surface-2` #131D30 (card, classe `bg-card`) · `surface-3` #1A2740 (raised/hover, classe `bg-card-2`/`bg-surface-3`).
- Fios, não bordas pesadas: hairline rgba(255,255,255,.06) (classe `border-edge`, hex pré-composto #212B3C) → strong rgba(255,255,255,.10) no hover (`border-edge-strong`).
- Top-highlight: todo `shadow-card`/`shadow-raised` embute `inset 0 1px 0 rgba(255,255,255,.05)` — o card "iluminado por cima". Variantes `shadow-card-gold`/`shadow-card-rose` para cards destaque/alerta.
- Elevação por sombra suave + brilho sutil, nunca borda grossa. Radius 14px (`rounded-card`) e 16px (`rounded-card-lg`). Hover de card: surface-3 + fio strong + translateY(-2px).

### Cor como sintaxe (cor só quando significa; nada decorativo)
- Dourado #F5A623 = decisão/valor da IA (accent primário); `gold-bright` #FBB454; gradiente 135° via `.gradient-gold` em heros/estados ativos.
- Esmeralda #2FBF8F (`positive`/`emerald`) = economia/protegido. Rosa #FB5B67 (`danger`/`rose`) = risco/exceção. Azure #5B8DEF (`info`/`azure`) = informativo. Extras: `violet` #9B7BF0, `cyan` #3FC9D6.
- Rampa categórica p/ gráficos (`dataRamp` em tokens.ts): [#F5A623, #5B8DEF, #2FBF8F, #9B7BF0, #FB5B67, #3FC9D6].
- Selos de ícone: círculo colorido + ícone branco (azure mercado, dourado clima/câmbio, rosa logística/risco, cinza dados internos).

### Tipografia (precisão Stripe)
- Inter = UI/corpo (`font-sans`) · Space Grotesk = números-herói/títulos display (`font-display`) · JetBrains Mono = células de tabela, valores densos, momentos-terminal (`font-mono`).
- Escala rígida em px via `text-11 … text-56`: 11 · 12 · 13 · 14 · 16 · 20 · 28 · 40 · 56.
- Eyebrow: classe `.eyebrow` (11px, caixa-alta, tracking largo, `text-ink-subtle`). Números SEMPRE `.tnums`, alinhados à direita em tabelas.
- Texto: `text-ink` #F4F7FF (strong) · `text-ink-muted` #C4CEE0 (corpo) · `text-ink-subtle` #8593AC (muted) · `text-ink-faint` #5C6883.

### Espaçamento
- Base 4px. Ritmo de seção 24/32 (`space-y-6`/`gap-4`+). Padding de card 20–24 (`p-5`). Alinhamento rígido à grade invisível — denso mas organizado.
- Linguagem de movimento e de gráficos: definidas em componentes próprios (src/theme/motion.ts e src/components/charts/chartTheme.ts — prompts R2/R3 da rodada de refino).

## Regras de hierarquia (checklist por tela)
- [ ] Existe UM elemento claramente dominante?
- [ ] Rótulos em caixa-alta apagada (.eyebrow); valores em display/mono, à direita e tabulares?
- [ ] Agrupamento por fio + alinhamento, não por caixa pesada?
- [ ] Toda animação revela relação/estado (nenhuma decorativa)?
- [ ] Cor só onde significa?
- [ ] Todo número de recomendação tem "por quê"?

## Âncoras de dados (usar valores realistas próximos destes)
- Volume: ~1 Mt/ano. Custo landed: R$ 1,35–1,5 bi/ano. Matérias-primas: 44,8% da receita.
- Receita 2025 R$ 10,44 bi; EBITDA R$ 1,1 bi; margem EBITDA 10,6%. ±10% no trigo ≈ ±R$ 140–150M CPV.
- Referências de mercado: trigo CBOT ~US$ 205/t; FOB Argentina 11,5% ~US$ 253/t; câmbio ~R$ 5,20/US$.
- 7 moinhos: Fortaleza/CE, Eusébio/CE, Natal/RN, Salvador/BA, Cabedelo/PB, Rolândia/PR, Bento Gonçalves/RS.
- Portos: Pecém/CE, Mucuripe/CE, Suape/PE, Aratu-Salvador/BA, Cabedelo/PB, Natal/RN.
- Origens: Argentina, EUA-Golfo (HRW/HRS), Canadá (CWRS), Rússia (Mar Negro), Uruguai, Brasil (RS/PR).
- Qualidade (faixas): proteína 8–14%; W 90–350; falling number 200–350s; P/L; peso hectolítrico ≥76 kg/hl; umidade ≤14%; cinzas; DON (ppb). Biscoito/cracker = soft, W baixo (~90–160). Massa/pão = hard, W alto (~250–350).
- Componentes do TLC (R$/t): FOB + prêmio origem + câmbio + frete marítimo + seguro + AFRMM + imposto (0% Mercosul / 10% extra-Mercosul) + despesas portuárias + demurrage(risco) + armazenagem + transporte interno + custo de capital.

## Cenário-âncora da demo ("terça, 7h") — a MESMA verdade em todas as telas
- Recomendação do dia: antecipar 18% do volume do trimestre + proteger 60% da exposição cambial → impacto protegido R$ 4,8M. Probabilidade de alta do trigo em 15 dias: 72%.
- Compra ótima: Argentina · porto Pecém · 32.000 t · janela 5 dias · blend 65% Argentina + 35% EUA(HRW) · TLC ~R$ 1.480/t vs baseline R$ 1.520/t (economia ~R$ 40/t).
- Exceção: navio MV Río Paraná com atraso de +6 dias → risco de demurrage; cobertura do Moinho Natal cai para 19 dias.
- Alertas: dólar perto do limite; safra argentina revisada p/ baixo; nova janela de hedge; estoque Moinho Fortaleza abaixo da política em 21 dias.

## As 8 telas (rotas)
1. Cockpit Executivo (/) 2. Previsão de Preço e Câmbio (/previsao) 3. Total Landed Cost (/tlc) 4. Recomendação de Compra (/compra) 5. Recomendação de Hedge (/hedge) 6. Simulador de Cenários (/simulador) 7. Alertas Diários (/alertas) 8. Copiloto Gemini (/copiloto).

## Marca
- Original: `m-dias-branco-logo-png_seeklogo-407830.png` (raiz do repo; PNG 320×320, wordmark monocromático escuro sobre transparente — manter intacto).
- Cópias de uso em `public/brand/`: `mdias-logo.png` (original, para fundos claros — README/tour) e `mdias-logo-branco.png` (branca gerada do canal alfa, recortada ao conteúdo 296×114, para o navy da UI).
- Regra de uso: versão branca na sidebar (fundo navy); colorida/original apenas em fundo claro. Dimensionar SEMPRE pela altura (`h-*` com `w-auto`), preservando o aspect ratio (~2,7:1). Sempre `alt="M. Dias Branco"`.
