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

## Atribuições de dados (modo "Ao vivo")

- **Clima**: [Open-Meteo.com](https://open-meteo.com/) — dados meteorológicos sob licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Câmbio**: [Frankfurter](https://frankfurter.dev/) — taxas de referência de bancos centrais (BCE).
- **Notícias**: [GDELT Project](https://www.gdeltproject.org/) — DOC 2.0 API (monitoramento global de notícias, gratuito).

> No modo "Cenário (demo)" nenhum dado externo é consultado; a decisão (TLC, R$ 4,8M, blend, hedge) é sempre encenada e nunca depende de rede.

> Confidencial — uso interno.
