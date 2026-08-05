import type { ClimaSnapshot, SinalMercado } from './types'

/** Preços e referências de mercado no instante da demo (terça, 12 ago · 07:00). */
export const PRECOS_ATUAIS = {
  cbotUsdT: 205,
  fobArgentinaUsdT: 253,
  fobHrwUsdT: 262,
  fobMarNegroUsdT: 231,
  cambioBrlUsd: 5.2,
  freteArgentinaNordesteUsdT: 19,
  /** Probabilidade de alta do trigo em 15 dias (modelo de previsão). */
  probAltaTrigo15dPct: 72,
} as const

/**
 * Clima encenado na zona núcleo (Rosário/AR) — coerente com a narrativa de
 * seca do cenário-âncora (inverno seco, safra revisada para baixo).
 * É o fallback do sinal ao vivo do Open-Meteo (useClimaAoVivo).
 */
export const CLIMA_CENARIO: ClimaSnapshot = {
  temperaturaC: 14,
  precipitacaoMm: 0,
  codigoTempo: 0,
  chuva7dMm: 1.2,
  horario: '2025-08-12T07:00',
}

export const SINAIS_MERCADO: SinalMercado[] = [
  {
    id: 'sinal-safra-argentina',
    categoria: 'mercado',
    impacto: 'alta',
    titulo: 'Bolsa de Cereales corta safra argentina em 2,1 Mt',
    descricao:
      'Revisão de 52,0 para 49,9 Mt por seca em Buenos Aires e La Pampa. Menor oferta exportável no 4º tri pressiona os prêmios FOB.',
    fonte: 'Bolsa de Cereales (Buenos Aires)',
    timestamp: '2025-08-12T05:15:00',
  },
  {
    id: 'sinal-mar-negro',
    categoria: 'clima',
    impacto: 'alta',
    titulo: 'Seca no Mar Negro reduz projeção de rendimento na Rússia',
    descricao:
      'Terceiro decêndio consecutivo sem chuva nas regiões de Rostov e Krasnodar; consultorias cortam a safra russa em 1,5–2,0 Mt.',
    fonte: 'SovEcon / IKAR',
    timestamp: '2025-08-11T22:40:00',
  },
  {
    id: 'sinal-hrw-colheita',
    categoria: 'mercado',
    impacto: 'baixa',
    titulo: 'Colheita HRW nos EUA avança 84% com boa qualidade',
    descricao:
      'Ritmo acima da média de 5 anos e proteína média de 12,4% limitam o prêmio HRW no Golfo apesar do CBOT firme.',
    fonte: 'USDA Crop Progress',
    timestamp: '2025-08-11T18:00:00',
  },
  {
    id: 'sinal-frete-upriver',
    categoria: 'logistica',
    impacto: 'alta',
    titulo: 'Frete Up River → Nordeste sobe US$ 2/t na semana',
    descricao:
      'Janela firme de embarques de milho compete por navios Handysize; frete Argentina→Pecém cotado a US$ 19/t.',
    fonte: 'Broker de fretes',
    timestamp: '2025-08-11T16:30:00',
  },
  {
    id: 'sinal-dolar',
    categoria: 'mercado',
    impacto: 'alta',
    titulo: 'Dólar testa R$ 5,20 com fluxo de saída',
    descricao:
      'Real pressionado por ruído fiscal; NDF de 90 dias negociado a R$ 5,27 — janela de hedge ainda favorável vs projeção de R$ 5,35.',
    fonte: 'Mesa de câmbio',
    timestamp: '2025-08-12T06:20:00',
  },
  {
    id: 'sinal-consumo-interno',
    categoria: 'interno',
    impacto: 'neutro',
    titulo: 'Consumo dos moinhos 2% acima do plano no mês',
    descricao:
      'Puxado por biscoitos no Nordeste; consumo diário consolidado de 2.980 t/dia encurta a cobertura de estoque em ~1 dia.',
    fonte: 'S&OP interno',
    timestamp: '2025-08-11T20:10:00',
  },
]
