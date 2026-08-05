# Auditoria de dependência — SINAL × DECISÃO por card/gráfico

Régua do produto: **periferia ao vivo, núcleo encenado**. Todo elemento das 8 telas (+ VRO)
classificado pelo que exibe:

- **SINAL** — câmbio, clima, preço-referência de trigo, notícia/geopolítica. Pode consumir
  `useLiveData` (fonte real + frescor + indicador; fallback = cenário).
- **DERIVADO-AO-VIVO** — valor recalculado de um sinal real sobre uma âncora encenada
  (ex.: exposição US$ × câmbio vivo). A *recomendação* sobre ele permanece do snapshot.
- **DECISÃO** — TLC recomendado, economia R$/t, R$ 4,8M, blend, hedge %, distribuição por
  moinho, VRO, prob. 72%. **Nunca depende de rede** — sempre `src/data`.

Legenda de status: 🟢 consome `useLiveData` · 🟡 derivado-ao-vivo (âncora encenada) ·
⚪ cenário por definição (sem fonte externa nesta demo).

## 1 · Cockpit Executivo (`/`)

| Card/gráfico | Classe | Status |
| --- | --- | --- |
| Hero "A decisão de hoje" (resumo, TLC 1.480, R$ 4,8M, blend, volume, janela) | DECISÃO | snapshot |
| KPI Contratado/trimestre · TLC do dia · Protegido vs exposto · Cobertura média · Impacto EBITDA (VRO) | DECISÃO | snapshot |
| KPI Câmbio (valor exibido) | SINAL | 🟢 Frankfurter (delta/projeção 30–90d: cenário) |
| Mini-card Trigo (valor + sparkline) | SINAL | 🟡 cenário × âncora da ref. mensal (FRED) |
| Mini-card Câmbio (valor + sparkline) | SINAL | 🟢 spot + série Frankfurter |
| Semáforo Preço (texto US$ hoje → 30d) | SINAL | 🟡 valores ancorados; prob. 72% e nível: DECISÃO |
| Semáforo Safra | SINAL | ⚪ USDA/CONAB encenado (sem fonte ao vivo) |
| Semáforo Clima | SINAL | 🟢 pior origem via Open-Meteo |
| Semáforo Geopolítica | SINAL | 🟢 densidade de manchetes GDELT/24h |
| Painel Risco logístico (embarques, MV Río Paraná, demurrage) | DECISÃO/cenário | snapshot |
| Alertas do dia + tabela de embarques | DECISÃO/cenário | snapshot |
| Ticker de notícias | SINAL | 🟢 GDELT (fallback: manchetes encenadas) |
| Pulse do topo (trigo/câmbio/frete) | SINAL | 🟢 câmbio · 🟡 trigo ancorado · ⚪ frete simulado |

## 2 · Previsão (`/previsao`)

| Card/gráfico | Classe | Status |
| --- | --- | --- |
| Gráfico preço do trigo — histórico | SINAL | 🟡 cenário × âncora mensal (chip "ref. mensal") |
| Gráfico preço do trigo — projeção + bandas | DECISÃO (modelo) | 🟡 forma/bandas encenadas; escala ancorada; prêmios de origem intactos |
| Card Leitura do modelo (prob. 72%, viés, convicção) | DECISÃO | snapshot |
| Leitura: faixa esperada / cenário central | DECISÃO (modelo) | 🟡 escala segue o gráfico ancorado |
| Leitura: câmbio projetado 90d | SINAL | 🟡 forma encenada × spot real |
| Gráfico câmbio — histórico | SINAL | 🟢 série real Frankfurter ~90d |
| Gráfico câmbio — forward/projeção | DECISÃO (modelo) | 🟡 forma encenada re-ancorada no spot; NDF: DECISÃO |
| Fatores explicáveis (trigo e câmbio) | DECISÃO (modelo) | snapshot |
| "E daí?" (TLC, economia, janela) | DECISÃO | snapshot |
| Faixa Sinais externos | SINAL | 🟢 FX + clima + ref. mensal |
| Painel Clima & Safra (4 regiões, mini-áreas) | SINAL | 🟢 Open-Meteo 16d → risco por limiar |

## 3 · Total Landed Cost (`/tlc`)

| Card/gráfico | Classe | Status |
| --- | --- | --- |
| KPI/Card rota recomendada + Decomposição do custo (waterfall R$/t) | DECISÃO | snapshot |
| Composição do risco no custo | DECISÃO | snapshot |
| Comparador de alternativas (origem × porto × moinho) | DECISÃO | snapshot |

## 4 · Recomendação de Compra (`/compra`)

| Card/gráfico | Classe | Status |
| --- | --- | --- |
| Recomendação (32 kt · Argentina · Pecém · janela 5d · confiança) | DECISÃO | snapshot |
| Por que esta recomendação / Alternativas rejeitadas | DECISÃO | snapshot |
| Distribuição por moinho (donut + tabela) | DECISÃO | snapshot |
| Estoque e cobertura por moinho | DECISÃO | snapshot |

## 5 · Recomendação de Hedge (`/hedge`)

| Card/gráfico | Classe | Status |
| --- | --- | --- |
| KPI Exposição cambial 90d — US$ | DECISÃO (âncora) | snapshot |
| KPI Exposição 90d — conversão ≈ R$ | SINAL | 🟡 US$ encenado × câmbio vivo (selo "ao vivo") |
| KPI Coberto vs aberto · VaR 95% · Exposição a preço | DECISÃO | snapshot |
| Exposição por bucket de prazo (gráfico; subtítulo em R$) | DECISÃO | 🟡 só a conversão R$ deriva |
| Recomendação proteger 60% · R$ 4,8M · NDF R$ 5,27 | DECISÃO | snapshot |
| Banda de orçamento cambial / Alertas de hedge | DECISÃO | snapshot |

## 6 · Simulador (`/simulador`)

| Card/gráfico | Classe | Status |
| --- | --- | --- |
| Sliders, perfis, impacto EBITDA por cenário, recomendação | DECISÃO | snapshot (`simularCenario` é função pura do snapshot) |

## 7 · Alertas (`/alertas`)

| Card/gráfico | Classe | Status |
| --- | --- | --- |
| KPIs de contagem, lista, detalhe, ações | DECISÃO/cenário | snapshot (narrativa das 7h) |

## 8 · Copiloto (`/copiloto`)

| Card/gráfico | Classe | Status |
| --- | --- | --- |
| Conversa, respostas ricas, chips | DECISÃO/cenário | snapshot |
| Faixa "Contexto ao vivo (GDELT)" | SINAL | 🟢 só aparece ao vivo (aditiva) |

## 9 · Realização de Valor (`/vro`)

| Card/gráfico | Classe | Status |
| --- | --- | --- |
| KPIs, Recomendação × Decisão × Resultado, curva vs meta, alavancas, saúde do modelo | DECISÃO | snapshot |
| Qualidade do dado (governança) | metadado | snapshot |

## Invariantes (verificadas por QA)

1. Nenhum número de DECISÃO consome `useLiveData` — os 🟡 derivam a *exibição* de uma âncora
   encenada; recomendações, níveis e probabilidades não mudam com a rede.
2. Modo **Cenário** = zero requisições; tudo idêntico ao cenário-âncora das 7h.
3. Todo 🟢/🟡 tem `SourceBadge` + "atualizado há Xs" + indicador ("ao vivo" verde ou
   "ref. mensal" âmbar); em fallback, selo/rotulo "cenário".
