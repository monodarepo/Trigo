<img src="public/brand/mdias-logo.png" alt="M. Dias Branco" height="96" />

# Torre de Controle do Trigo

Mockup navegável (protótipo de venda, sem backend) do **Hub de Trigo** — um Decision Intelligence Hub
que recomenda, de forma contínua e explicável, quando comprar, quanto, de qual origem, por qual porto,
para qual moinho, com qual blend e qual parcela proteger por hedge, otimizando pelo **custo total
landed ajustado ao risco**.

Cliente: **M. Dias Branco** · Parceria: **Monoda × Google Cloud** · Tese: *"Um Único Trigo"* — todas
as áreas decidindo sobre a mesma verdade.

## Rodando

```bash
npm install
npm run dev      # desenvolvimento (http://localhost:5173)
npm run build    # build de produção
npm run preview  # serve o build
```

Build para hospedagem estática (rotas por hash): `VITE_HASH_ROUTER=1 npm run build`.

## As 8 telas

| Rota | Tela |
| --- | --- |
| `/` | Cockpit Executivo |
| `/previsao` | Previsão de Preço e Câmbio |
| `/tlc` | Total Landed Cost |
| `/compra` | Recomendação de Compra |
| `/hedge` | Recomendação de Hedge |
| `/simulador` | Simulador de Cenários |
| `/alertas` | Alertas Diários |
| `/copiloto` | Copiloto Gemini |

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
- **Notícias**: [GDELT Project](https://www.gdeltproject.org/) — DOC 2.0 API (monitoramento global de notícias, gratuito).

> No modo "Cenário (demo)" nenhum dado externo é consultado; a decisão (TLC, R$ 4,8M, blend, hedge) é sempre encenada e nunca depende de rede.

> Confidencial — uso interno.
