import type { Alerta } from './types'
import { ESTOQUE_MOINHOS } from './compra'
import { POLITICA_CAMBIO_LIMITE } from './hedge'
import { MV_RIO_PARANA } from './logistica'
import { PRECOS_ATUAIS } from './mercado'
import { formatBRL } from './format'

const estoqueFortaleza = ESTOQUE_MOINHOS.find((e) => e.moinhoId === 'fortaleza')!
const estoqueNatal = ESTOQUE_MOINHOS.find((e) => e.moinhoId === 'natal')!

/**
 * Alertas do cenário-âncora ("terça, 7h"). O badge do sino conta os de
 * severidade crítico + alto (4). Textos interpolam os mesmos objetos
 * usados nas telas de TLC, Compra e Hedge — nenhuma cópia manual.
 */
export const ALERTAS: Alerta[] = [
  {
    id: 'alerta-rio-parana',
    severidade: 'critico',
    categoria: 'logistica',
    timestamp: '2025-08-12T05:40:00',
    titulo: `${MV_RIO_PARANA.navio} com atraso de +${MV_RIO_PARANA.atrasoDias} dias`,
    descricao:
      `Nova ETA em 20/08 no porto de Natal (${MV_RIO_PARANA.volumeToneladas.toLocaleString('pt-BR')} t). ` +
      `Risco de demurrage de ${formatBRL(MV_RIO_PARANA.riscoDemurrageRs!, { compacto: true })} e cobertura do Moinho Natal ` +
      `reduzida para ${estoqueNatal.coberturaDias} dias.`,
    acaoRota: '/tlc',
    acaoRotulo: 'Ver impacto no TLC',
  },
  {
    id: 'alerta-dolar-limite',
    severidade: 'alto',
    categoria: 'cambio',
    timestamp: '2025-08-12T06:20:00',
    titulo: `Dólar a R$ ${PRECOS_ATUAIS.cambioBrlUsd.toFixed(2).replace('.', ',')} — a 1% do limite de política`,
    descricao:
      `Limite de política em R$ ${POLITICA_CAMBIO_LIMITE.toFixed(2).replace('.', ',')}. ` +
      'Projeção de R$ 5,35 em 90 dias com banda até R$ 5,60; cobertura atual de 27% está abaixo do alvo.',
    acaoRota: '/hedge',
    acaoRotulo: 'Rever hedge cambial',
  },
  {
    id: 'alerta-safra-argentina',
    severidade: 'alto',
    categoria: 'mercado',
    timestamp: '2025-08-12T05:15:00',
    titulo: 'Safra argentina revisada para baixo (−2,1 Mt)',
    descricao:
      'Bolsa de Cereales corta a safra de 52,0 para 49,9 Mt por seca. Probabilidade de alta do trigo em 15 dias sobe para ' +
      `${PRECOS_ATUAIS.probAltaTrigo15dPct}% — reforça a antecipação de compra.`,
    acaoRota: '/previsao',
    acaoRotulo: 'Ver previsão de preço',
  },
  {
    id: 'alerta-estoque-fortaleza',
    severidade: 'alto',
    categoria: 'estoque',
    timestamp: '2025-08-11T21:00:00',
    titulo: `Moinho Fortaleza abaixo da política: ${estoqueFortaleza.coberturaDias} dias de cobertura`,
    descricao:
      `Cobertura de ${estoqueFortaleza.coberturaDias} dias vs política mínima de ${estoqueFortaleza.politicaMinimaDias} dias. ` +
      'A compra recomendada destina 12.000 t a Fortaleza, recompondo para 39 dias.',
    acaoRota: '/compra',
    acaoRotulo: 'Ver recomendação de compra',
  },
  {
    id: 'alerta-janela-hedge',
    severidade: 'medio',
    categoria: 'hedge',
    timestamp: '2025-08-12T06:05:00',
    titulo: 'Nova janela de hedge: NDF 90 dias a R$ 5,27',
    descricao:
      'Forward points recuaram e o NDF de 90 dias abriu desconto de R$ 0,08 vs cenário-base de R$ 5,35. ' +
      'Janela estimada de 2–3 pregões.',
    acaoRota: '/hedge',
    acaoRotulo: 'Abrir recomendação de hedge',
  },
  {
    id: 'alerta-cobertura-natal',
    severidade: 'medio',
    categoria: 'estoque',
    timestamp: '2025-08-12T05:45:00',
    titulo: `Cobertura do Moinho Natal caiu para ${estoqueNatal.coberturaDias} dias`,
    descricao:
      `Efeito do atraso do ${MV_RIO_PARANA.navio}. A compra recomendada aloca 7.000 t a Natal ` +
      '(cobertura volta a 38 dias após descarga).',
    acaoRota: '/compra',
    acaoRotulo: 'Ver distribuição por moinho',
  },
  {
    id: 'alerta-restricao-exportacao',
    severidade: 'medio',
    categoria: 'mercado',
    timestamp: '2025-08-11T23:20:00',
    titulo: 'Rússia estuda nova restrição de exportação de trigo',
    descricao:
      'Ministério avalia cota adicional para o 4º trimestre. A alternativa Mar Negro pode ficar indisponível na ' +
      'janela — teste o impacto com a restrição de origem no Simulador.',
    acaoRota: '/simulador',
    acaoRotulo: 'Simular restrição de origem',
  },
  {
    id: 'alerta-prob-alta',
    severidade: 'info',
    categoria: 'mercado',
    timestamp: '2025-08-12T05:00:00',
    titulo: `Probabilidade de alta em 15 dias subiu para ${PRECOS_ATUAIS.probAltaTrigo15dPct}%`,
    descricao:
      'Modelo de previsão incorporou o corte da safra argentina e a seca no Mar Negro; projeção de US$ 214/t em 30 dias.',
    acaoRota: '/previsao',
    acaoRotulo: 'Ver fatores do modelo',
  },
  {
    id: 'alerta-don-russia',
    severidade: 'info',
    categoria: 'qualidade',
    timestamp: '2025-08-11T19:30:00',
    titulo: 'Lote russo reprovado na triagem: DON 1.800 ppb',
    descricao:
      'Amostra de pré-embarque da alternativa Mar Negro acima da política para biscoito (≤ 1.000 ppb). ' +
      'Alternativa mantida fora da recomendação.',
    acaoRota: '/tlc',
    acaoRotulo: 'Comparar alternativas',
  },
]

/** Contagem para o sino da Topbar: alertas críticos + altos. */
export const CONTAGEM_ALERTAS_SINO = ALERTAS.filter(
  (a) => a.severidade === 'critico' || a.severidade === 'alto',
).length
