# Wheat & Flour Value Tower — Torre de Controle de Trigo, Farinha e Margem — Contexto do Projeto (leia antes de qualquer tarefa)

## O que é
Mockup navegável (protótipo de venda, sem backend) da **Wheat & Flour Value Tower — Torre de Controle de Trigo, Farinha e Margem**: um Decision Intelligence Hub que recomenda, de forma contínua e explicável, a cadeia inteira — do grão à margem. No TRIGO: QUANDO comprar, QUANTO, de QUAL origem, com QUAL fornecedor, por QUAL porto, para QUAL moinho, com QUAL blend e QUAL parcela proteger por hedge, otimizando pelo CUSTO TOTAL LANDED ajustado ao risco (não pelo preço nominal). Na FARINHA: QUAL moinho processa, QUAL farinha produzir e a QUAL custo interno real. Na MARGEM: QUANTO destinar às fábricas próprias (verticalização) e QUANTO vender a terceiros, e QUANDO é melhor comprar farinha pronta em vez de moer. Cliente: M. Dias Branco. Parceria: Monoda × Google Cloud. Público: executivos (CPO/CFO) + times de negócio e TI. Tese de origem: "Um Único Trigo" — todas as áreas decidindo sobre a mesma verdade; agora evoluída para **um único número de margem**: a mesma verdade econômica atravessa compra, moagem, verticalização e venda externa.

## Tese v2 — Trigo, Farinha e Margem
**PERGUNTA CENTRAL (Make/Buy/Sell):** vale mais MOER o trigo que compramos, COMPRAR farinha pronta no mercado, ou VENDER farinha a terceiros? A resposta não é anual nem corporativa: é contínua, explicável e granular **por moinho × tipo de farinha** — recalculada a cada movimento de trigo, câmbio, frete, energia, farelo e preço de farinha.

**RECOMENDAÇÃO CONSOLIDADA que o produto entrega:** qual trigo comprar (origem, volume, janela, blend, hedge) · em qual moinho processar · qual farinha produzir · quanto dessa farinha destinar às fábricas próprias · e quanto vender no mercado externo — com o "por quê" de cada número.

**A otimização é pela MARGEM DA CADEIA, não pelo preço do trigo isolado.** Comprar trigo mais barato pode destruir margem (rendimento pior, farelo pior, farinha fora de especificação, moinho errado, frete interno maior). O critério de decisão é sempre margem trigo→farinha→destino, ajustada ao risco.

## Modelo econômico
**EM DESTAQUE — números canônicos do produto:** custo interno da farinha = **R$ 2.100/t** · rendimento de moagem ≈ **76%** · farelo/subprodutos ≈ **24%**. Toda tela, card, gráfico e narrativa parte destes valores; não recalcule por conta própria nem invente variantes.

Parâmetros: rendimento de moagem 76% (farinha) · farelo/subprodutos 24% · preço do farelo R$ 682/t · custo de servir (venda externa) R$ 120/t.

**DOIS TLCs, não confundir.** `R$ 1.480/t` é o TLC do **lote recomendado** (Argentina · Pecém), que desembarca em **Eusébio** — é o número do cenário-âncora e da tela de Compra. `R$ 1.473,4/t` é o TLC de **regime do moinho Fortaleza** (Argentina · Mucuripe, seu porto preferencial) — é o que entra no custo da farinha de Fortaleza. Ambos saem do mesmo motor (`calcularTlcMock`); cada moinho tem porto e frete interno próprios, então atribuir o TLC de um moinho a outro é erro.

### Composição do custo interno da farinha (R$ por tonelada de FARINHA)
Par-âncora: **moinho Fortaleza × farinha de massas**.

| Componente | R$/t farinha |
| --- | ---: |
| Trigo posto no porto (R$ 1.464,2/t ÷ 0,76) | 1.926,6 |
| Custo de conversão (moagem, mão de obra, embalagem) | 184,0 |
| Energia e manutenção | 100,7 |
| Logística interna porto → moinho (R$ 9,2/t ÷ 0,76) | 12,1 |
| Perdas e custo financeiro do estoque em processo | 44,0 |
| Depreciação | 48,0 |
| (−) Crédito do farelo (0,3158 t × R$ 682/t) | −215,4 |
| **= CUSTO INTERNO DA FARINHA (pleno absorvido)** | **2.100,0** |
| Custo **evitável** (= pleno − depreciação) | 2.052,0 |
| Custo **marginal** (trigo + logística + variáveis − farelo) | 1.960,0 |

A logística interna sai do TLC em **linha própria** porque é ela que separa um moinho de porto (Fortaleza, R$ 9,2/t de trigo) de um do interior (Bento Gonçalves, R$ 112/t): some quase todo o spread do parque. As duas primeiras linhas juntas são o trigo posto no moinho (R$ 1.938,7/t de farinha).

**Três bases de custo, três decisões.** O **pleno** (R$ 2.100/t) é a visão de P&L e a base dos KPIs. A decisão **Make/Buy** se faz no **evitável** (R$ 2.052/t): a depreciação é afundada e não desaparece ao comprar farinha de terceiros, então deixá-la pesar contra "produzir" fecha moinho por um custo que continua saindo — quando as duas bases divergem em sinal, o motor emite alerta explícito no racional. Já a decisão de **vender a tonelada incremental** com o moinho ocioso se faz no **marginal** (R$ 1.960/t): fixos e depreciação já foram absorvidos pelo volume atual, mas trigo e logística interna são 100% variáveis e entram inteiros. Vender abaixo do marginal + custo de servir destrói margem mesmo com capacidade parada.

### Fórmula 1 — custo interno da farinha (R$/t farinha)
```
custoInterno  = TLCtrigo / rendimento + conversão + energiaManut + perdasFinanceiro + depreciação − créditoFarelo
créditoFarelo = ((1 / rendimento) − 1) × preçoFarelo
```

### Fórmula 2 — ganho da verticalização (R$/t farinha)
```
ganho = preçoEquivalenteCompraExterna − custoInterno = 2.350 − 2.100 = R$ 250/t
total = ganho × toneladas destinadas às fábricas próprias
```

### Fórmula 3 — margem de venda externa (R$/t farinha)
```
margem = preçoLíquidoVenda − custoInterno − custoDeServir = 2.500 − 2.100 − 120 = R$ 280/t
```

**ÂNCORAS:** custo interno canônico R$ 2.100/t · preço equivalente externo R$ 2.350/t → ganho R$ 250/t · venda líquida R$ 2.500/t → margem ~R$ 280/t · rendimento ~76% · farelo/subprodutos ~24%.

### As 5 alternativas, em DUAS decisões
O motor (`src/data/economics.ts` → `decisaoMakeBuySell`) não escolhe entre cinco opções num ranking só. São **duas decisões sobre tonelagens diferentes**, e misturá-las é o erro que faz "vender" (margem maior por tonelada) parecer melhor que "produzir" sem notar que a demanda das fábricas ficaria descoberta:

1. **Demanda das fábricas** → `produzir e consumir` · `comprar de terceiros` · `produzir e estocar` · `parar a moagem`.
2. **Capacidade ociosa** → `produzir e vender` · deixar parada.

Todos os resultados são medidos em R$/t contra a MESMA referência — comprar farinha no mercado, que vale 0 por definição —, então são comparáveis entre si. `comprar` e `parar a moagem` são estados distintos: em `comprar` a capacidade é redirecionada para outra spec; em `parar`, não é, e os fixos viram perda. O **valor da decisão** é sempre a recomendada menos a segunda melhor — é assim que "comprar" mostra o quanto de perda evitou, em vez de aparecer como zero.

### Capacidade e demanda (precisam fechar)
Capacidade instalada: **100.300 t de trigo/mês** (1.203 kt/ano). Demanda consolidada das 4 famílias: **84.051 t/mês** (~1,008 Mt/ano) ⇒ ocupação de **83,8%**, deixando folga real para venda externa. Consumo do trimestre (252.153 t) = já contratado (74.153 t, 29,4%) + **a comprar (178.000 t)** — é sobre este último que a recomendação do dia antecipa 18% (32.000 t). Consumo e compra são números diferentes; confundi-los quebra a âncora dos 18%.

## Comparação apples-to-apples
**REGRA:** NUNCA comparar o custo interno da farinha com um "preço médio de farinha" de mercado. A comparação só é válida entre produtos equivalentes nestes 8 eixos:
1. **Especificação** — proteína, W, cinzas, umidade.
2. **Aplicação** — massa, biscoito, pão, bolo, pizza, doméstica, industrial.
3. **Apresentação** — granel, big-bag, saco 25 kg, saco 1 kg.
4. **Mercado/canal** — industrial, panificação, distribuidor, varejo.
5. **Região** — onde a farinha é entregue/consumida.
6. **Logística** — posto fábrica vs. posto cliente, CIF/FOB.
7. **Condição comercial** — prazo, volume, contrato vs. spot.
8. **Qualidade/serviço** — constância, assistência técnica, nível de serviço.

Comparar sem esses eixos mistura produtos diferentes num mesmo número e faz o Make/Buy/Sell escolher pela diferença de especificação, embalagem, canal ou frete — e não pela diferença real de custo —, levando a fechar moinho, comprar farinha ou vender externo com base numa vantagem que não existe.

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

## Arquitetura de informação (rotas)
Seis seções na sidebar, do sinal à decisão. `(NOVA)` = placeholder a criar nesta etapa; as demais são telas existentes (quando marcadas "rótulo/título", só o texto muda — a tela permanece).

**VISÃO**
- `/` — **Visão Executiva** (tela atual `Cockpit.tsx` — só muda rótulo/título).

**MERCADO & SINAIS**
- `/previsao` — **Mercado de Trigo e Farinha** (tela atual `Forecast.tsx` — só muda rótulo/título).
- `/sinais` — **Sinais ao Vivo** (tela atual `LiveSignals.tsx`).

**TRIGO**
- `/tlc` — **Total Landed Cost** (atual).
- `/compra` — **Recomendação de Compra** (atual).
- `/hedge` — **Hedge** (atual).
- `/estoques` — **Estoques & Blends** (NOVA → `src/pages/Inventory.tsx`).

**MOINHOS & FARINHA**
- `/moinhos` — **Performance dos Moinhos** (NOVA → `src/pages/MillPerformance.tsx`).
- `/verticalizacao` — **Rentabilidade da Verticalização** (NOVA → `src/pages/Verticalization.tsx`).
- `/demanda` — **Planejamento da Demanda** (NOVA → `src/pages/DemandPlanning.tsx`).

**MARGEM & DECISÃO**
- `/make-buy-sell` — **Simulador Make/Buy/Sell** (NOVA → `src/pages/MakeBuySell.tsx`).
- `/oportunidades` — **Oportunidades Comerciais** (NOVA → `src/pages/Opportunities.tsx`).
- `/simulador` — **Simulador de Cenários** (tela ATUAL `Simulator.tsx` — PRESERVAR, não apagar).
- `/alertas` — **Alertas & Decisões** (tela atual `Alerts.tsx` — só muda rótulo/título).

**GOVERNANÇA**
- `/copiloto` — **Copiloto Executivo** (tela atual `Copilot.tsx` — só muda rótulo/título).
- `/vro` — **Realização de Valor** (atual).

Rota default continua `/` (Visão Executiva). `/showcase` e `/exportar` seguem fora da sidebar, intocadas.

## Marca
- Original: `m-dias-branco-logo-png_seeklogo-407830.png` (raiz do repo; PNG 320×320, wordmark monocromático escuro sobre transparente — manter intacto).
- Cópias de uso em `public/brand/`: `mdias-logo.png` (original, para fundos claros — README/tour), `mdias-logo-branco.png` (branca gerada do canal alfa, recortada ao conteúdo 296×114, para o navy da UI) e `mdias-logo-recorte.png` (original recortado ao conteúdo 288×106, para fundos claros em alturas pequenas — ex.: cabeçalho do one-pager /exportar).
- Regra de uso: versão branca na sidebar (fundo navy); colorida/original apenas em fundo claro. Dimensionar SEMPRE pela altura (`h-*` com `w-auto`), preservando o aspect ratio (~2,7:1). Sempre `alt="M. Dias Branco"`.
