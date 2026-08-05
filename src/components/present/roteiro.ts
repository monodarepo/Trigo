/**
 * Roteiro da narrativa das 7h — a demo que se apresenta sozinha.
 * Todos os números vêm do snapshot (verdade única); nenhum literal solto.
 *
 * `alvo` é um seletor CSS do elemento central do passo:
 *  - páginas com card-herói dourado usam '.shadow-card-gold' (1º da tela);
 *  - gráficos/tabelas usam [data-spot="…"] marcado na própria tela;
 *  - se o alvo não existir (ex.: visualização 3D indisponível), o passo
 *    roda sem spotlight — legenda e navegação seguem normais.
 */
import { snapshot, formatBRL, formatPct, formatTon, formatUSD } from '../../data'

export interface PassoApresentacao {
  rota: string
  titulo: string
  /** Legenda/narração curta: o que olhar nesta tela. */
  olhar: string
  alvo: string
}

const rec = snapshot.recomendacaoDoDia
const { tlc, hedge, mercado, previsao, simulador, vro } = snapshot
const altRussia = tlc.alternativas.find((a) => a.id === 'alt-russia-suape')!
const altRecomendada = tlc.alternativas.find((a) => a.recomendada)!
const reducaoVarPct = Math.round((1 - hedge.recomendacao.varDepoisRs / hedge.recomendacao.varAntesRs) * 100)
const fmtCambio = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

export const ROTEIRO: readonly PassoApresentacao[] = [
  {
    rota: '/',
    titulo: 'A decisão de hoje',
    alvo: 'main .shadow-card-gold',
    olhar:
      `Terça, 7h. O hub abre com uma única decisão: antecipar ${formatPct(rec.compra.anteciparPctTrimestre)} do trimestre ` +
      `e proteger ${formatPct(rec.hedge.coberturaAlvoPct)} do câmbio — impacto protegido de ` +
      `${formatBRL(rec.impactoProtegidoRs, { compacto: true })}. A mesma verdade para todas as áreas.`,
  },
  {
    rota: '/previsao',
    titulo: 'Por que o preço vai subir',
    alvo: '[data-spot="previsao"]',
    olhar:
      `${formatPct(mercado.precos.probAltaTrigo15dPct)} de probabilidade de alta em 15 dias: CBOT US$ ` +
      `${previsao.precoTrigo.valorAtual} → US$ ${previsao.precoTrigo.horizontes.d30.valor}/t em 30 dias, com banda de ` +
      'confiança e fatores explicáveis — nada de caixa-preta.',
  },
  {
    rota: '/tlc',
    titulo: 'Menor FOB ≠ menor landed',
    alvo: '[data-spot="tlc"]',
    olhar:
      `O custo que importa vai do FOB ao moinho: a Rússia tem FOB menor (US$ ${altRussia.fobUsd} vs US$ ` +
      `${altRecomendada.fobUsd}), mas fecha a ${formatBRL(altRussia.tlcRs)}/t — imposto, frete e qualidade viram o jogo. ` +
      `O otimizador decide pelos ${formatBRL(tlc.recomendadoRs)}/t ajustados ao risco.`,
  },
  {
    rota: '/compra',
    titulo: 'A recomendação executável',
    alvo: 'main .shadow-card-gold',
    olhar:
      `${formatTon(rec.compra.volumeToneladas)} da Argentina via Pecém, janela de ${rec.compra.janelaDias} dias, blend ` +
      `${rec.compra.blend.map((b) => b.pct).join('/')} — economia de ` +
      `${formatBRL(rec.compra.economiaTotalRs, { compacto: true })} no lote, com racional completo e alçada de aprovação.`,
  },
  {
    rota: '/hedge',
    titulo: `Proteger ${formatPct(rec.hedge.coberturaAlvoPct)} do câmbio`,
    alvo: 'main .shadow-card-gold',
    olhar:
      `NDF de ${formatUSD(rec.hedge.notionalNovoUsd, { compacto: true })} a ` +
      `${fmtCambio(hedge.recomendacao.taxaForwardMedia)} eleva a cobertura de ` +
      `${formatPct(hedge.recomendacao.coberturaAtualPct)} para ${formatPct(rec.hedge.coberturaAlvoPct)} — o VaR cambial ` +
      `cai ${reducaoVarPct}% e o gatilho da política fica visível na banda de orçamento.`,
  },
  {
    rota: '/simulador',
    titulo: 'E se…?',
    alvo: '[data-spot="simulador"]',
    olhar:
      `Trigo +${formatPct(simulador.defaults.variacaoPrecoTrigoPct)}, câmbio ` +
      `+${formatPct(simulador.defaults.variacaoCambioPct, 1)}, ${simulador.defaults.atrasoLogisticoDias} dias de atraso: ` +
      'três posturas comparadas em segundos — o recomendado equilibra CPV e exposição residual.',
  },
  {
    rota: '/copiloto',
    titulo: 'Pergunte à IA',
    alvo: 'main [role="log"]',
    olhar:
      'Linguagem natural sobre a mesma verdade: “devemos antecipar a compra?” devolve números, fontes e ações — a IA ' +
      'recomenda, o executivo decide.',
  },
  {
    rota: '/vro',
    titulo: 'O valor que já capturamos',
    alvo: '[data-spot="vro"]',
    olhar:
      `O placar de governança: ${formatBRL(vro.metricas.ebitdaIncrementalYtdRs, { compacto: true })} de EBITDA ` +
      `incremental YTD e hit-rate de ${formatPct(vro.metricas.hitRatePct)} — cada recomendação com decisão humana e ` +
      'resultado medido, sem dupla contagem.',
  },
]
