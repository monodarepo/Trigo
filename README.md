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
| Trigo | `/estoques` | Estoques & Blends — otimizador de blend de menor custo |
| Moinhos & Farinha | `/moinhos` | Performance dos Moinhos — custeio, eficiência e custo marginal |
| Moinhos & Farinha | `/verticalizacao` | Rentabilidade da Verticalização — ganho por moinho × spec |
| Moinhos & Farinha | `/demanda` | Planejamento da Demanda — vendas → farinha → trigo |
| Margem & Decisão | `/make-buy-sell` | Simulador Make/Buy/Sell — a decisão central da tese |
| Margem & Decisão | `/oportunidades` | Oportunidades Comerciais — onde vender rende mais |
| Margem & Decisão | `/simulador` | Simulador de Cenários |
| Margem & Decisão | `/alertas` | Alertas & Decisões |
| Governança | `/copiloto` | Copiloto Executivo |
| Governança | `/vro` | Realização de Valor |
| Governança | `/poc` | **Modo POC** — piloto de 90 dias (reconstrução histórica) |

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

## Modo POC (`/poc`)

O recorte para um piloto de 90 dias: **1 moinho** (Fortaleza), **2 farinhas** (massas e biscoito),
**2 regiões**, **3 origens** e **2 fábricas**. Não é uma versão reduzida do produto — é uma
**reconstrução histórica** de seis meses fechados que responde, com os dados que a empresa já tinha:

- qual era o **custo real** da farinha, mês a mês (e quanto o custo-padrão errava);
- quanto teria custado **comprar** a mesma spec no mercado;
- qual seria a **margem de venda** do excedente;
- qual **decisão** teria maximizado o resultado — e quanto valor passou pela mesa.

O motor está em [`src/data/poc.ts`](src/data/poc.ts). A série de câmbio e FOB termina exatamente no
cenário corrente, então o último mês do POC reproduz os números canônicos (TLC de regime
**R$ 1.473,4/t** em Fortaleza, custo interno **R$ 2.100/t**) — há uma verificação em tempo de módulo
que avisa no console se a âncora sair do lugar.

**Duas colunas, sempre**: o resultado ex-post é um **teto** (supõe visão perfeita); ao lado dele vai a
**captura realista**, com o mesmo haircut de 15–20% que o VRO aplica. Levar o teto para o business
case é o erro que mata um piloto no segundo mês.

## Arquitetura

- **Vite + React 18 + TypeScript** (estrito) · Tailwind · React Router · Recharts · lucide-react · framer-motion.
- **Verdade única**: todos os números vêm de `src/data` (snapshot do cenário-âncora "terça, 7h").
  Nenhum componente inventa número.
- **Code-split por rota**: só a Visão Executiva vem no bundle inicial; as demais telas carregam sob
  demanda (`React.lazy`), com o mesmo esqueleto de sempre como fallback do Suspense. O Recharts
  (~330 kB) fica fora da rota de entrada.
- Design system navy + dourado em `src/theme/tokens.ts` (fonte única do tema Tailwind).
- Contexto completo do projeto (âncoras de dados, cenário e convenções): [`CLAUDE.md`](CLAUDE.md).

## Deploy

O build é estático (`dist/`) e roda em qualquer host. As duas configurações versionadas:

- **Netlify** — [`netlify.toml`](netlify.toml): `npm run build` → `dist`, redirect SPA `/* → /index.html`
  e `/api/* → /.netlify/functions/:splat`. A função vive em [`netlify/functions/wheat.ts`](netlify/functions/wheat.ts).
- **Vercel** — a mesma função no formato da plataforma em [`api/wheat.ts`](api/wheat.ts).

As duas leem a mesma variável de ambiente e respondem o mesmo contrato; o cliente só conhece `/api/wheat`.

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
