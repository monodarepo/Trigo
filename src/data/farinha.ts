/**
 * Elo 2 da cadeia — FARINHA: especificações e mercado externo.
 *
 * A farinha é a unidade de comparação apples-to-apples do produto: só faz
 * sentido confrontar custo interno com preço de mercado quando spec, aplicação,
 * apresentação, canal, região, base logística e condição comercial coincidem
 * (CLAUDE.md § Comparação apples-to-apples). Por isso todo preço externo aqui
 * carrega `comparavel` e, quando falso, a `ressalva` que explica o ajuste.
 */
import type { FarinhaId, FarinhaSpec, PrecoFarinhaExterno } from './types'
import { TLC_RECOMENDADO_RS } from './tlc'

/**
 * As 6 farinhas do portfólio. `tlcTrigoRsT` é o custo do trigo/blend que cada
 * spec exige, ANCORADO no TLC recomendado do cenário (R$ 1.480/t para a farinha
 * de massas, a spec do blend 65% Argentina + 35% EUA-HRW): farinhas soft usam
 * blends mais baratos, farinhas hard usam mais HRW e custam mais.
 *
 * `ajusteRendimentoPp` segue as cinzas: farinha mais refinada (cinzas baixas)
 * extrai MENOS do grão e derruba o rendimento; farinha mais rústica extrai mais.
 */
export const FARINHAS: FarinhaSpec[] = [
  {
    id: 'massa',
    nome: 'Farinha para massas',
    proteina: 12.0,
    gluten: 300,
    cinzas: 0.62,
    umidade: 14.0,
    fallingNumber: 320,
    cor: 1.8,
    granulometria: 98,
    aplicacao: 'massa',
    tlcTrigoRsT: TLC_RECOMENDADO_RS, // R$ 1.480/t — a spec-âncora do cenário
    ajusteRendimentoPp: 0,
    blendReferencia: '65% Argentina + 35% EUA (HRW)',
  },
  {
    id: 'pao',
    nome: 'Farinha para pão',
    proteina: 12.8,
    gluten: 320,
    cinzas: 0.65,
    umidade: 14.0,
    fallingNumber: 330,
    cor: 2.1,
    granulometria: 97,
    aplicacao: 'pao',
    tlcTrigoRsT: 1512,
    ajusteRendimentoPp: 0.4,
    blendReferencia: '50% Argentina + 50% EUA (HRW) — W alto',
  },
  {
    id: 'cracker',
    nome: 'Farinha para cracker',
    proteina: 10.4,
    gluten: 155,
    cinzas: 0.58,
    umidade: 14.0,
    fallingNumber: 310,
    cor: 1.5,
    granulometria: 98,
    aplicacao: 'biscoito',
    tlcTrigoRsT: 1446,
    ajusteRendimentoPp: -0.4,
    blendReferencia: '80% Argentina + 20% Brasil (RS)',
  },
  {
    id: 'domestica',
    nome: 'Farinha doméstica (multiuso)',
    proteina: 10.8,
    gluten: 200,
    cinzas: 0.55,
    umidade: 14.0,
    fallingNumber: 300,
    cor: 1.2,
    granulometria: 99,
    aplicacao: 'domestica',
    tlcTrigoRsT: 1462,
    ajusteRendimentoPp: -0.7,
    blendReferencia: '75% Argentina + 25% EUA (HRW)',
  },
  {
    id: 'biscoito',
    nome: 'Farinha para biscoito',
    proteina: 9.2,
    gluten: 130,
    cinzas: 0.52,
    umidade: 14.0,
    fallingNumber: 300,
    cor: 1.1,
    granulometria: 99,
    aplicacao: 'biscoito',
    tlcTrigoRsT: 1428,
    ajusteRendimentoPp: -1.0,
    blendReferencia: '70% Argentina (soft) + 30% Brasil (RS)',
  },
  {
    id: 'bolo',
    nome: 'Farinha para bolo',
    proteina: 8.4,
    gluten: 95,
    cinzas: 0.45,
    umidade: 14.0,
    fallingNumber: 290,
    cor: 0.8,
    granulometria: 99.5,
    aplicacao: 'bolo',
    tlcTrigoRsT: 1402,
    ajusteRendimentoPp: -1.6,
    blendReferencia: '60% Argentina (soft) + 40% Brasil (RS)',
  },
]

export function getFarinha(id: FarinhaId): FarinhaSpec | undefined {
  return FARINHAS.find((f) => f.id === id)
}

/**
 * Preços de farinha de terceiros. O primeiro registro é o PREÇO EQUIVALENTE do
 * cenário-âncora (R$ 2.350/t, massa · Nordeste · industrial · granel · posto
 * fábrica): mesma spec e mesma base logística do custo interno de Fortaleza —
 * a única comparação que vale sem ajuste.
 */
export const PRECOS_FARINHA_EXTERNOS: PrecoFarinhaExterno[] = [
  {
    id: 'ext-massa-ne-ind-granel',
    regiao: 'nordeste',
    farinhaId: 'massa',
    canal: 'industrial',
    apresentacao: 'granel',
    precoRsT: 2350,
    base: 'posto-fabrica',
    prazoDias: 21,
    volumeMinimoT: 1000,
    fonte: 'Cotação de moageiros independentes CE/PE (média de 3 ofertas)',
    comparavel: true,
  },
  {
    id: 'ext-massa-ne-panif-saco',
    regiao: 'nordeste',
    farinhaId: 'massa',
    canal: 'panificacao',
    apresentacao: 'saco-25kg',
    precoRsT: 2620,
    base: 'posto-cliente',
    prazoDias: 28,
    volumeMinimoT: 50,
    fonte: 'Lista de preços de distribuidores — canal panificação',
    comparavel: false,
    ressalva:
      'Inclui embalagem 25 kg, frete até o cliente e prazo de 28 dias. Descontar ~R$ 270/t desses três itens antes de comparar com o custo interno posto fábrica.',
  },
  {
    id: 'ext-pao-ne-ind-granel',
    regiao: 'nordeste',
    farinhaId: 'pao',
    canal: 'industrial',
    apresentacao: 'granel',
    precoRsT: 2395,
    base: 'posto-fabrica',
    prazoDias: 21,
    volumeMinimoT: 800,
    fonte: 'Cotação de moageiros independentes CE/PE',
    comparavel: true,
  },
  {
    id: 'ext-pao-ne-panif-saco',
    regiao: 'nordeste',
    farinhaId: 'pao',
    canal: 'panificacao',
    apresentacao: 'saco-25kg',
    precoRsT: 2690,
    base: 'posto-cliente',
    prazoDias: 28,
    volumeMinimoT: 40,
    fonte: 'Lista de preços de distribuidores — canal panificação',
    comparavel: false,
    ressalva:
      'Canal e apresentação diferentes do custo interno (granel, posto fábrica). Ajuste de embalagem + frete + prazo antes de qualquer conclusão de Make/Buy.',
  },
  {
    id: 'ext-biscoito-ne-ind-granel',
    regiao: 'nordeste',
    farinhaId: 'biscoito',
    canal: 'industrial',
    apresentacao: 'granel',
    precoRsT: 2285,
    base: 'posto-fabrica',
    prazoDias: 21,
    volumeMinimoT: 1000,
    fonte: 'Cotação de moageiros independentes CE/RN',
    comparavel: true,
  },
  {
    id: 'ext-cracker-ne-ind-granel',
    regiao: 'nordeste',
    farinhaId: 'cracker',
    canal: 'industrial',
    apresentacao: 'granel',
    precoRsT: 2310,
    base: 'posto-fabrica',
    prazoDias: 21,
    volumeMinimoT: 600,
    fonte: 'Cotação de moageiros independentes CE/PE',
    comparavel: true,
  },
  {
    id: 'ext-bolo-ne-ind-bigbag',
    regiao: 'nordeste',
    farinhaId: 'bolo',
    canal: 'industrial',
    apresentacao: 'big-bag',
    precoRsT: 2440,
    base: 'posto-fabrica',
    prazoDias: 21,
    volumeMinimoT: 300,
    fonte: 'Cotação de moageiros especializados (farinha de baixa cinza)',
    comparavel: true,
  },
  {
    id: 'ext-domestica-ne-varejo-1kg',
    regiao: 'nordeste',
    farinhaId: 'domestica',
    canal: 'varejo',
    apresentacao: 'saco-1kg',
    precoRsT: 3480,
    base: 'posto-cliente',
    prazoDias: 45,
    volumeMinimoT: 20,
    fonte: 'Preço de gôndola (média de 4 redes) convertido para R$/t',
    comparavel: false,
    ressalva:
      'Preço de gôndola por kg: embute embalagem 1 kg, distribuição capilar, verba de trade e margem do varejo. NUNCA comparar com custo interno de granel — é o erro clássico de "preço médio de farinha".',
  },
  {
    id: 'ext-domestica-ne-distrib-saco',
    regiao: 'nordeste',
    farinhaId: 'domestica',
    canal: 'distribuidor',
    apresentacao: 'saco-25kg',
    precoRsT: 2515,
    base: 'posto-cliente',
    prazoDias: 35,
    volumeMinimoT: 200,
    fonte: 'Tabela de distribuidores regionais NE',
    comparavel: false,
    ressalva: 'Posto cliente e saco 25 kg — descontar frete e embalagem (~R$ 180/t) para comparar.',
  },
  {
    id: 'ext-massa-sul-ind-granel',
    regiao: 'sul',
    farinhaId: 'massa',
    canal: 'industrial',
    apresentacao: 'granel',
    precoRsT: 2180,
    base: 'posto-fabrica',
    prazoDias: 21,
    volumeMinimoT: 1000,
    fonte: 'Cotação de moageiros PR/RS — mercado próximo à origem do trigo',
    comparavel: true,
  },
  {
    id: 'ext-pao-sul-ind-granel',
    regiao: 'sul',
    farinhaId: 'pao',
    canal: 'industrial',
    apresentacao: 'granel',
    precoRsT: 2215,
    base: 'posto-fabrica',
    prazoDias: 21,
    volumeMinimoT: 800,
    fonte: 'Cotação de moageiros PR/RS',
    comparavel: true,
  },
  {
    id: 'ext-massa-sudeste-ind-granel',
    regiao: 'sudeste',
    farinhaId: 'massa',
    canal: 'industrial',
    apresentacao: 'granel',
    precoRsT: 2295,
    base: 'posto-fabrica',
    prazoDias: 21,
    volumeMinimoT: 1000,
    fonte: 'Cotação de moageiros SP/MG',
    comparavel: true,
  },
  {
    id: 'ext-biscoito-sudeste-ind-granel',
    regiao: 'sudeste',
    farinhaId: 'biscoito',
    canal: 'industrial',
    apresentacao: 'granel',
    precoRsT: 2240,
    base: 'posto-fabrica',
    prazoDias: 21,
    volumeMinimoT: 800,
    fonte: 'Cotação de moageiros SP/MG',
    comparavel: true,
  },
  {
    id: 'ext-massa-co-ind-granel',
    regiao: 'centro-oeste',
    farinhaId: 'massa',
    canal: 'industrial',
    apresentacao: 'granel',
    precoRsT: 2260,
    base: 'posto-fabrica',
    prazoDias: 21,
    volumeMinimoT: 600,
    fonte: 'Cotação de moageiros GO/MT',
    comparavel: true,
  },
  {
    id: 'ext-massa-norte-distrib-saco',
    regiao: 'norte',
    farinhaId: 'massa',
    canal: 'distribuidor',
    apresentacao: 'saco-25kg',
    precoRsT: 2740,
    base: 'posto-cliente',
    prazoDias: 42,
    volumeMinimoT: 150,
    fonte: 'Tabela de distribuidores PA/AM',
    comparavel: false,
    ressalva:
      'Frete fluvial e prazo de 42 dias dominam o preço. Só comparável após ajustar logística e custo financeiro (~R$ 330/t).',
  },
]

/**
 * Preço externo COMPARÁVEL (apples-to-apples) de uma farinha numa região:
 * mesma spec, canal industrial, granel e posto fábrica — a única base que pode
 * ser confrontada direto com o custo interno. Retorna null quando não existe
 * cotação comparável (aí a decisão de Make/Buy exige ajuste explícito).
 */
export function precoExternoComparavel(
  farinhaId: FarinhaId,
  regiao: PrecoFarinhaExterno['regiao'] = 'nordeste',
): PrecoFarinhaExterno | null {
  return (
    PRECOS_FARINHA_EXTERNOS.find(
      (p) => p.farinhaId === farinhaId && p.regiao === regiao && p.comparavel,
    ) ?? null
  )
}
