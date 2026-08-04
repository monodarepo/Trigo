# Torre de Controle do Trigo — Contexto do Projeto (leia antes de qualquer tarefa)

## O que é
Mockup navegável (protótipo de venda, sem backend) do "Hub de Trigo": um Decision Intelligence Hub que recomenda, de forma contínua e explicável, QUANDO comprar, QUANTO, de QUAL origem, com QUAL fornecedor, por QUAL porto, para QUAL moinho, com QUAL blend e QUAL parcela proteger por hedge — otimizando pelo CUSTO TOTAL LANDED ajustado ao risco (não pelo preço nominal). Cliente: M. Dias Branco. Parceria: Monoda × Google Cloud. Público: executivos (CPO/CFO) + times de negócio e TI. Tese central: "Um Único Trigo" — todas as áreas decidindo sobre a mesma verdade.

## Stack e convenções
- Vite + React 18 + TypeScript + Tailwind + React Router + Recharts + lucide-react + framer-motion.
- Componentes funcionais, hooks, TypeScript estrito. Nada de backend: dados vêm SEMPRE de src/data (nenhum número mágico solto em componentes).
- Números com `tabular-nums`. Moeda BRL "R$ 1.480" (pt-BR). Datas em pt-BR.
- Acessibilidade: foco visível, aria-labels em ícones, contraste AA, prefers-reduced-motion.

## Design system (paleta do deck — navy + dourado)
- bg base #0B1733; superfícies: #12213F (card), #16264D (card-2); bordas #24386B.
- Texto: #FFFFFF (forte), #C9D3E6 (muted), #8A97B4 (subtle).
- Dourado (destaque/valor): #F5A623 (primary), #FBB040 (light).
- Semânticas: positivo #35C08A; risco/alto #E5484D; atenção/médio #F5A623; info #4C82F7.
- Selos de ícone: círculo colorido com ícone branco (azul p/ mercado, laranja p/ clima, vermelho p/ logística/risco, cinza p/ dados internos).
- Radius 12–16px em cards; sombras suaves; SEM barras/listras decorativas nas bordas; SEM linha sob títulos.
- Fontes: Space Grotesk para números/títulos display; Inter para UI/corpo.

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
