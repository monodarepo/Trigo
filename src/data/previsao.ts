import type { PontoPrevisao, SeriePrevisao } from './types'
import { PRECOS_ATUAIS } from './mercado'

/**
 * Séries semanais: ~12 semanas de histórico + projeção até 90 dias
 * a partir de 12/08/2025, com banda de confiança (P10–P90).
 */

const CBOT_D7: PontoPrevisao = { data: '2025-08-19', valor: 208, bandaMin: 205, bandaMax: 211 }
const CBOT_D30: PontoPrevisao = { data: '2025-09-11', valor: 214, bandaMin: 207, bandaMax: 221 }
const CBOT_D60: PontoPrevisao = { data: '2025-10-11', valor: 217, bandaMin: 206, bandaMax: 229 }
const CBOT_D90: PontoPrevisao = { data: '2025-11-10', valor: 219, bandaMin: 204, bandaMax: 234 }

export const SERIE_PRECO_TRIGO: SeriePrevisao = {
  id: 'cbot',
  nome: 'Trigo CBOT',
  unidade: 'US$/t',
  valorAtual: PRECOS_ATUAIS.cbotUsdT,
  variacao30dPct: 1.0,
  historico: [
    { data: '2025-05-20', valor: 196 },
    { data: '2025-05-27', valor: 199 },
    { data: '2025-06-03', valor: 197 },
    { data: '2025-06-10', valor: 201 },
    { data: '2025-06-17', valor: 203 },
    { data: '2025-06-24', valor: 200 },
    { data: '2025-07-01', valor: 202 },
    { data: '2025-07-08', valor: 204 },
    { data: '2025-07-15', valor: 203 },
    { data: '2025-07-22', valor: 206 },
    { data: '2025-07-29', valor: 204 },
    { data: '2025-08-05', valor: 205 },
    { data: '2025-08-12', valor: 205 },
  ],
  projecao: [
    { data: '2025-08-12', valor: 205, bandaMin: 205, bandaMax: 205 },
    CBOT_D7,
    { data: '2025-08-26', valor: 210, bandaMin: 206, bandaMax: 215 },
    CBOT_D30,
    { data: '2025-09-26', valor: 216, bandaMin: 207, bandaMax: 225 },
    CBOT_D60,
    { data: '2025-10-26', valor: 218, bandaMin: 205, bandaMax: 231 },
    CBOT_D90,
  ],
  horizontes: { d7: CBOT_D7, d30: CBOT_D30, d60: CBOT_D60, d90: CBOT_D90 },
  fatores: [
    {
      rotulo: 'Safra argentina revisada para baixo',
      peso: 0.35,
      direcao: 'alta',
      descricao: 'Corte de 2,1 Mt pela Bolsa de Cereales reduz oferta exportável no 4º tri.',
    },
    {
      rotulo: 'Seca no Mar Negro',
      peso: 0.25,
      direcao: 'alta',
      descricao: 'Rendimento russo em queda; prêmios FOB Mar Negro reagindo.',
    },
    {
      rotulo: 'Demanda de importadores (MENA/Sudeste Asiático)',
      peso: 0.15,
      direcao: 'alta',
      descricao: 'Licitações do Egito e Indonésia acima do ritmo sazonal.',
    },
    {
      rotulo: 'Colheita HRW nos EUA com boa qualidade',
      peso: 0.15,
      direcao: 'baixa',
      descricao: 'Oferta hard americana confortável limita a ponta compradora.',
    },
    {
      rotulo: 'Dólar global forte',
      peso: 0.1,
      direcao: 'baixa',
      descricao: 'Índice DXY elevado encarece o trigo em moeda local dos importadores.',
    },
  ],
}

const FX_D7: PontoPrevisao = { data: '2025-08-19', valor: 5.22, bandaMin: 5.18, bandaMax: 5.26 }
const FX_D30: PontoPrevisao = { data: '2025-09-11', valor: 5.28, bandaMin: 5.16, bandaMax: 5.4 }
const FX_D60: PontoPrevisao = { data: '2025-10-11', valor: 5.31, bandaMin: 5.14, bandaMax: 5.48 }
const FX_D90: PontoPrevisao = { data: '2025-11-10', valor: 5.35, bandaMin: 5.1, bandaMax: 5.6 }

export const SERIE_CAMBIO: SeriePrevisao = {
  id: 'cambio',
  nome: 'Câmbio BRL/USD',
  unidade: 'R$/US$',
  valorAtual: PRECOS_ATUAIS.cambioBrlUsd,
  variacao30dPct: 0.8,
  historico: [
    { data: '2025-05-20', valor: 5.04 },
    { data: '2025-05-27', valor: 5.08 },
    { data: '2025-06-03', valor: 5.06 },
    { data: '2025-06-10', valor: 5.1 },
    { data: '2025-06-17', valor: 5.12 },
    { data: '2025-06-24', valor: 5.15 },
    { data: '2025-07-01', valor: 5.13 },
    { data: '2025-07-08', valor: 5.16 },
    { data: '2025-07-15', valor: 5.18 },
    { data: '2025-07-22', valor: 5.17 },
    { data: '2025-07-29', valor: 5.19 },
    { data: '2025-08-05', valor: 5.21 },
    { data: '2025-08-12', valor: 5.2 },
  ],
  projecao: [
    { data: '2025-08-12', valor: 5.2, bandaMin: 5.2, bandaMax: 5.2 },
    FX_D7,
    { data: '2025-08-26', valor: 5.24, bandaMin: 5.18, bandaMax: 5.3 },
    FX_D30,
    { data: '2025-09-26', valor: 5.29, bandaMin: 5.15, bandaMax: 5.44 },
    FX_D60,
    { data: '2025-10-26', valor: 5.33, bandaMin: 5.12, bandaMax: 5.54 },
    FX_D90,
  ],
  horizontes: { d7: FX_D7, d30: FX_D30, d60: FX_D60, d90: FX_D90 },
  fatores: [
    {
      rotulo: 'Risco fiscal doméstico',
      peso: 0.4,
      direcao: 'alta',
      descricao: 'Ruído sobre meta fiscal sustenta prêmio de risco no real.',
    },
    {
      rotulo: 'Diferencial de juros ainda elevado',
      peso: 0.3,
      direcao: 'baixa',
      descricao: 'Carry trade atrai fluxo e segura o dólar abaixo de R$ 5,30 no curto prazo.',
    },
    {
      rotulo: 'Balança comercial forte',
      peso: 0.2,
      direcao: 'baixa',
      descricao: 'Exportações do agro geram oferta de dólares à vista.',
    },
    {
      rotulo: 'Aversão a risco global',
      peso: 0.1,
      direcao: 'alta',
      descricao: 'Eventual risk-off empurraria emergentes para cima na banda.',
    },
  ],
}
