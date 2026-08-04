import type { PontoPrevisao, PrevisaoOrigem, SeriePrevisao } from './types'
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
      rotulo: 'Safra argentina',
      peso: 0.3,
      direcao: 'alta',
      descricao: 'Corte de 2,1 Mt pela Bolsa de Cereales reduz a oferta exportável do 4º tri.',
    },
    {
      rotulo: 'Mar Negro / geopolítica',
      peso: 0.22,
      direcao: 'alta',
      descricao: 'Seca na Rússia e prêmio de risco nas rotas do Mar Negro.',
    },
    {
      rotulo: 'Posições especulativas',
      peso: 0.15,
      direcao: 'alta',
      descricao: 'Fundos reduzem a posição vendida líquida em Chicago.',
    },
    {
      rotulo: 'Estoques globais',
      peso: 0.15,
      direcao: 'baixa',
      descricao: 'Colheita HRW nos EUA avança com boa qualidade; estoques confortáveis.',
    },
    {
      rotulo: 'Frete marítimo',
      peso: 0.1,
      direcao: 'alta',
      descricao: 'Handysize disputado pelo milho encarece o CIF no Nordeste.',
    },
    {
      rotulo: 'Dólar global',
      peso: 0.08,
      direcao: 'baixa',
      descricao: 'DXY forte encarece o trigo para importadores e modera a demanda.',
    },
  ],
}

/**
 * Curvas projetadas por origem: FOB = CBOT projetado + prêmio interpolado
 * linearmente do atual ao de 90 dias. Prêmios atuais fecham com PRECOS_ATUAIS
 * (Argentina 205+48=253 · EUA 205+57=262 · Rússia 205+26=231).
 */
function projecaoComPremio(premioInicial: number, premioFinal: number): PontoPrevisao[] {
  const n = SERIE_PRECO_TRIGO.projecao.length
  return SERIE_PRECO_TRIGO.projecao.map((p, i) => {
    const premio = premioInicial + ((premioFinal - premioInicial) * i) / (n - 1)
    const soma = (v: number | undefined) => (v == null ? undefined : Math.round(v + premio))
    return { data: p.data, valor: Math.round(p.valor + premio), bandaMin: soma(p.bandaMin), bandaMax: soma(p.bandaMax) }
  })
}

export const PREVISOES_ORIGEM: PrevisaoOrigem[] = [
  { origemId: 'argentina', rotulo: 'Argentina', premioAtualUsdT: 48, premioD90UsdT: 56, projecao: projecaoComPremio(48, 56) },
  { origemId: 'eua-golfo', rotulo: 'EUA-Golfo (HRW)', premioAtualUsdT: 57, premioD90UsdT: 58, projecao: projecaoComPremio(57, 58) },
  { origemId: 'canada', rotulo: 'Canadá (CWRS)', premioAtualUsdT: 68, premioD90UsdT: 70, projecao: projecaoComPremio(68, 70) },
  { origemId: 'russia', rotulo: 'Rússia (Mar Negro)', premioAtualUsdT: 26, premioD90UsdT: 34, projecao: projecaoComPremio(26, 34) },
]

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
