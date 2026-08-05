<img src="public/brand/mdias-logo.png" alt="M. Dias Branco" height="96" />

# Wheat & Flour Value Tower — Torre de Controle de Trigo, Farinha e Margem

Mockup navegável (protótipo de venda, sem backend) — um Decision Intelligence Hub que recomenda, de
forma contínua e explicável, a cadeia inteira do grão à margem. No **trigo**: quando comprar, quanto,
de qual origem, por qual porto, para qual moinho, com qual blend e qual parcela proteger por hedge,
otimizando pelo **custo total landed ajustado ao risco**. Na **farinha**: qual moinho processa, qual
farinha produzir e a que custo interno real. Na **margem**: quanto verticalizar para as fábricas
próprias, quanto vender a terceiros e quando compensa comprar farinha pronta em vez de moer
(**Make/Buy/Sell**).

Cliente: **M. Dias Branco** · Parceria: **Monoda × Google Cloud** · Tese: *"Um Único Trigo"*, evoluída
para **um único número de margem** — a mesma verdade econômica atravessa compra, moagem e venda.

## Rodando

```bash
npm install
npm run dev      # desenvolvimento (http://localhost:5173)
npm run build    # build de produção
npm run preview  # serve o build
```

Build para hospedagem estática (rotas por hash): `VITE_HASH_ROUTER=1 npm run build`.

## As telas, por elo da cadeia

| Seção | Rota | Tela |
| --- | --- | --- |
| Visão | `/` | Visão Executiva |
| Mercado & Sinais | `/previsao` | Mercado de Trigo e Farinha |
| Mercado & Sinais | `/sinais` | Sinais ao Vivo |
| Trigo | `/tlc` | Total Landed Cost |
| Trigo | `/compra` | Recomendação de Compra |
| Trigo | `/hedge` | Hedge |
| Trigo | `/estoques` | Estoques & Blends *(placeholder)* |
| Moinhos & Farinha | `/moinhos` | Performance dos Moinhos *(placeholder)* |
| Moinhos & Farinha | `/verticalizacao` | Rentabilidade da Verticalização *(placeholder)* |
| Moinhos & Farinha | `/demanda` | Planejamento da Demanda *(placeholder)* |
| Margem & Decisão | `/make-buy-sell` | Simulador Make/Buy/Sell *(placeholder)* |
| Margem & Decisão | `/oportunidades` | Oportunidades Comerciais *(placeholder)* |
| Margem & Decisão | `/simulador` | Simulador de Cenários |
| Margem & Decisão | `/alertas` | Alertas & Decisões |
| Governança | `/copiloto` | Copiloto Executivo |
| Governança | `/vro` | Realização de Valor |

## Modelo econômico

O motor em `src/data/economics.ts` responde à pergunta Make/Buy/Sell com três fórmulas determinísticas,
todas ancoradas no TLC do trigo (elo 1) — mexeu na compra, moveu a margem:

```
custoInterno = TLCtrigo / rendimento + conversão + energia + perdas + depreciação − créditoFarelo
ganho        = preçoEquivalenteCompraExterna − custoInterno          (2.350 − 2.100 = R$ 250/t)
margem       = preçoLíquidoVenda − custoInterno − custoDeServir      (2.500 − 2.100 − 120 = R$ 280/t)
```

Custo interno canônico **R$ 2.100/t** de farinha (Fortaleza × farinha de massas), rendimento de moagem
**76%**, farelo/subprodutos **24%**. Preços externos só entram na comparação quando marcados como
*apples-to-apples* — mesma spec, canal, apresentação, região e base logística. Ver [`CLAUDE.md`](CLAUDE.md).

## Arquitetura

- **Vite + React 18 + TypeScript** (estrito) · Tailwind · React Router · Recharts · lucide-react · framer-motion.
- **Verdade única**: todos os números vêm de `src/data` (snapshot do cenário-âncora "terça, 7h").
  Nenhum componente inventa número.
- Design system navy + dourado em `src/theme/tokens.ts` (fonte única do tema Tailwind).
- Contexto completo do projeto (âncoras de dados, cenário e convenções): [`CLAUDE.md`](CLAUDE.md).

## Preço de trigo de referência (proxy serverless)

O preço de trigo "ao vivo" é a **referência mensal** (série FRED `PWHEAMTUSDM`, servida
pela Alpha Vantage) — **não** é cotação intraday CBOT, e a UI rotula isso honestamente
("Referência mensal · FRED via Alpha Vantage"). O pulso do topo oscila ±0,1–0,3% **sobre**
essa âncora.

- Função: [`api/wheat.ts`](api/wheat.ts) (Vercel Functions) — busca no servidor, responde
  `{ valorUsdT, data, fonte }` com `Cache-Control: s-maxage=21600, stale-while-revalidate`
  (respeita o limite gratuito de 25 req/dia); em erro responde 200 com `{ stale: true }` +
  último valor conhecido; sem chave, responde `null`.
- **Variáveis de ambiente** (Settings → Environment Variables na Vercel — nunca no cliente):
  - `ALPHAVANTAGE_KEY` — chave da Alpha Vantage (preferida), **ou**
  - `FRED_KEY` — chave do FRED (provedor alternativo).
- O browser **nunca** chama Alpha Vantage/FRED diretamente — só `/api/wheat`.

### Fallback puro-estático (sem serverless)

Sem a função (dev local, preview single-file), o `/api/wheat` responde 404 → o cliente cai
no **valor-semente versionado** em `src/data` (`PRECOS_ATUAIS.cbotUsdT = US$ 205/t`) e só o
pulso oscila — o restante do app funciona exatamente igual.

## Atribuições de dados (modo "Ao vivo")

- **Clima**: [Open-Meteo.com](https://open-meteo.com/) — dados meteorológicos sob licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Câmbio**: [Frankfurter](https://frankfurter.dev/) — taxas de referência de bancos centrais (BCE).
- **Trigo (referência mensal)**: [FRED](https://fred.stlouisfed.org/series/PWHEAMTUSDM) — série
  `PWHEAMTUSDM` (Global price of Wheat, FMI), servida via [Alpha Vantage](https://www.alphavantage.co/)
  pelo proxy `api/wheat.ts`.
- **Notícias**: [GDELT Project](https://www.gdeltproject.org/) — DOC 2.0 API (monitoramento global de notícias, gratuito).

> **Licenciamento**: os planos gratuitos acima cobrem este protótipo de demonstração. **Uso
> comercial/produtivo exige revisão de licenciamento** de cada fonte (termos da Alpha Vantage,
> atribuição CC BY 4.0 do Open-Meteo, termos de uso do GDELT e do FRED) antes de ir a produção.

> No modo "Cenário (demo)" nenhum dado externo é consultado; a decisão (TLC, R$ 4,8M, blend, hedge) é sempre encenada e nunca depende de rede.

> Confidencial — uso interno.
