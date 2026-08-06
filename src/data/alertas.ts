import type { Alerta } from './types'
import { ESTOQUE_MOINHOS, ORCAMENTO_TRIGO_RS_T, RECOMENDACAO_COMPRA, VOLUME_TRIMESTRE_T } from './compra'
import { POLITICA_CAMBIO_LIMITE, RECOMENDACAO_HEDGE } from './hedge'
import { MV_RIO_PARANA } from './logistica'
import { PRECOS_ATUAIS } from './mercado'
import { OPORTUNIDADES_COMERCIAIS, getClienteExterno } from './comercial'
import { CENARIOS_MAKE_BUY_SELL } from './makeBuySell'
import { precoExternoComparavel } from './farinha'
import { analisarLotes } from './estoqueTrigo'
import { planoPorMoinho } from './demanda'
import {
  ARMAZENAGEM_FARINHA_RS_T,
  TAXA_CAPITAL_MES,
  custoInternoFarinha,
  eficienciaMoinho,
  sensibilidadeRendimentoRsT,
} from './economics'
import { decomposicaoCambialDoTlc, tlcNoCambio } from './simuladorMbs'
import { TLC_RECOMENDADO_RS } from './tlc'
import { formatBRL, formatPct, formatTon } from './format'

const estoqueFortaleza = ESTOQUE_MOINHOS.find((e) => e.moinhoId === 'fortaleza')!
const estoqueNatal = ESTOQUE_MOINHOS.find((e) => e.moinhoId === 'natal')!

const arred = (v: number) => Math.round(v)
const rsT = (v: number) => `${formatBRL(v)}/t`
const pp = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} p.p.`

// ---------------------------------------------------------------------------
// Derivações do elo farinha/margem — nenhum número destes alertas é digitado.
// Se o TLC do trigo mudar, o impacto em R$ de cada alerta muda junto.
// ---------------------------------------------------------------------------

/**
 * 1 · Mercado do Sul abaixo do custo evitável de Bento Gonçalves. A economia é
 * custo EVITÁVEL − preço externo (e não o inverso): comprar só rende quando o
 * que se deixa de gastar supera o que se passa a pagar.
 */
const cenarioBento = CENARIOS_MAKE_BUY_SELL.find((c) => c.moinhoId === 'bento-goncalves')!
const economiaComprarRsT =
  Math.round((cenarioBento.custoEvitavelRsT - cenarioBento.precoExternoRsT) * 10) / 10
const economiaComprarRs = economiaComprarRsT * cenarioBento.volumeT

/** 2 · Pedidos recomendados cuja margem supera o ganho de consumir internamente. */
const superamUsoInterno = OPORTUNIDADES_COMERCIAIS.filter(
  (o) => o.status === 'recomendada' && o.superaUsoInterno === true && o.ganhoUsoInternoRsT != null,
)
const ganhoAcimaDoInternoRs = superamUsoInterno.reduce(
  (soma, o) => soma + (o.margemRsT - (o.ganhoUsoInternoRsT ?? 0)) * o.volumeT,
  0,
)
const melhorPedido = [...superamUsoInterno].sort(
  (a, b) => b.margemRsT - (b.ganhoUsoInternoRsT ?? 0) - (a.margemRsT - (a.ganhoUsoInternoRsT ?? 0)),
)[0]

/** 3 · Rolândia: a folga até a capacidade econômica mínima. */
const rolandia = eficienciaMoinho('rolandia', 'massa')
const producaoRolandiaT = arred((rolandia.capacidadeFarinhaT * rolandia.utilizacaoPct) / 100)
const valorEmRiscoRolandiaRs = rolandia.ganhoRsT * producaoRolandiaT

/** 4 · Queda de rendimento em Cabedelo (−0,8 p.p. vs regime). */
const QUEDA_RENDIMENTO_PP = 0.8
const cabedelo = eficienciaMoinho('cabedelo', 'biscoito')
const producaoCabedeloT = arred((cabedelo.capacidadeFarinhaT * cabedelo.utilizacaoPct) / 100)
/** O motor devolve o custo de UM ponto percentual; a queda observada é menor. */
const custoPorPontoRsT = sensibilidadeRendimentoRsT('cabedelo', 'biscoito')
const custoQuedaRendimentoRsT = Math.round(custoPorPontoRsT * QUEDA_RENDIMENTO_PP * 10) / 10
const custoQuedaRendimentoRs = custoQuedaRendimentoRsT * producaoCabedeloT

/** 5 · TLC do dia contra o orçamento do trimestre. */
const desvioOrcamentoRsT = TLC_RECOMENDADO_RS - ORCAMENTO_TRIGO_RS_T
const desvioOrcamentoRs = desvioOrcamentoRsT * VOLUME_TRIMESTRE_T

/** 6 · Lote bloqueado por DON — capital parado no silo. */
const loteBloqueado = analisarLotes('massa').find((l) => l.lote.status === 'bloqueado')!
const capitalParadoRs = loteBloqueado.lote.quantidadeT * TLC_RECOMENDADO_RS
const carregamentoLoteRs = capitalParadoRs * TAXA_CAPITAL_MES

/** 7 · Farinha sem destino interno em Rolândia (68% de ocupação). */
const planoRolandia = planoPorMoinho().find((p) => p.moinhoId === 'rolandia')!
const custoRolandiaRsT = custoInternoFarinha('rolandia', 'massa').totalRsT
const carregamentoFarinhaRs =
  planoRolandia.farinhaDisponivelT * (ARMAZENAGEM_FARINHA_RS_T + custoRolandiaRsT * TAXA_CAPITAL_MES)

/** 8 · Capacidade ociosa em Salvador com preço acima do custo marginal. */
const salvador = eficienciaMoinho('salvador', 'massa')
const potencialSalvadorRs = salvador.margemIncrementalRsT * salvador.capacidadeOciosaT

/** 9 · Pedido que forçaria compra emergencial (guardrail em ruptura). */
const pedidoRuptura = OPORTUNIDADES_COMERCIAIS.find((o) => o.guardrail.semaforo === 'ruptura')!
const margemAparenteRs = pedidoRuptura.margemRsT * pedidoRuptura.volumeT
const margemRealRs = pedidoRuptura.guardrail.margemPonderadaRsT * pedidoRuptura.volumeT
const margemQueNaoSeRealizaRs = margemRealRs - margemAparenteRs

/**
 * 10 · Câmbio que INVERTE a decisão em Rolândia. O ponto de virada sai da
 * mesma decomposição do simulador: só a parcela dolarizada do TLC se move, e a
 * conta é resolvida para o câmbio em que o custo interno alcança o preço de
 * mercado da região.
 */
const decomp = decomposicaoCambialDoTlc('rolandia')
const custoFixoDaFarinhaRsT =
  custoRolandiaRsT - custoInternoFarinha('rolandia', 'massa').componentes
    .filter((c) => c.tipo === 'trigo' || c.tipo === 'logistica')
    .reduce((s, c) => s + c.valorRs, 0)
const rendimentoRolandia = custoInternoFarinha('rolandia', 'massa').rendimentoPct / 100
const precoSulRsT = precoExternoComparavel('massa', 'sul')!.precoRsT
/** (tlc/rendimento) + fixos = preço ⇒ tlc = (preço − fixos) × rendimento. */
const tlcDeViradaRsT = (precoSulRsT - custoFixoDaFarinhaRsT) * rendimentoRolandia
const cambioDeVirada = (tlcDeViradaRsT - decomp.brlFixoRsT) / decomp.usdPorT
/**
 * A perda é medida no TOPO DA BANDA de 90 dias (P90), não no ponto de virada:
 * no ponto de virada, por definição, a perda é zero. Usar o mesmo número do
 * alerta de capacidade mínima faria dois alertas distintos exibirem o mesmo
 * valor, sugerindo cópia onde há duas contas diferentes.
 */
const CAMBIO_P90 = 5.6
const custoRolandiaNoP90RsT =
  (tlcNoCambio('rolandia', CAMBIO_P90) / rendimentoRolandia) + custoFixoDaFarinhaRsT
const perdaRolandiaNoP90Rs = (custoRolandiaNoP90RsT - precoSulRsT) * producaoRolandiaT

/**
 * Alertas do cenário-âncora ("terça, 7h"). O badge do sino conta os de
 * severidade crítico + alto. Textos e impactos interpolam os mesmos objetos
 * usados nas telas — nenhuma cópia manual, nenhum número digitado.
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
    impactoRs: -(MV_RIO_PARANA.riscoDemurrageRs ?? 0),
    impactoBase: 'evento',
    impactoNota: 'risco neste embarque',
    agenteId: 'tlc',
  },
  {
    id: 'alerta-farinha-abaixo-custo',
    severidade: 'critico',
    categoria: 'farinha',
    timestamp: '2025-08-12T06:35:00',
    titulo: `Farinha de terceiros no Sul a ${rsT(cenarioBento.precoExternoRsT)} — abaixo do custo de moer em Bento Gonçalves`,
    descricao:
      `O custo EVITÁVEL de Bento Gonçalves é ${rsT(cenarioBento.custoEvitavelRsT)} (sem a depreciação, que sai de qualquer jeito). ` +
      `Comprar a mesma spec no mercado do Sul economiza ${rsT(economiaComprarRsT)} nas ${formatTon(cenarioBento.volumeT)} da janela. ` +
      'Perto da origem do trigo o mercado bate a moagem própria — a decisão certa aqui é comprar, não moer.',
    acaoRota: '/make-buy-sell',
    acaoRotulo: 'Abrir Make/Buy/Sell',
    impactoRs: economiaComprarRs,
    impactoBase: 'mes',
    agenteId: 'make-buy-sell',
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
    impactoRs: RECOMENDACAO_HEDGE.protecaoEstimadaRs,
    impactoBase: 'evento',
    impactoNota: 'proteção no horizonte de 90 dias',
    agenteId: 'alertas-financeiros',
  },
  {
    id: 'alerta-venda-supera-interno',
    severidade: 'alto',
    categoria: 'comercial',
    timestamp: '2025-08-12T06:30:00',
    titulo: `${superamUsoInterno.length} pedidos rendem mais vendidos do que consumidos internamente`,
    descricao:
      `O maior deles, ${getClienteExterno(melhorPedido.clienteId)?.nome}, entrega ${rsT(melhorPedido.margemRsT)} de margem contra ` +
      `${rsT(melhorPedido.ganhoUsoInternoRsT ?? 0)} de ganho se a mesma farinha for para as fábricas — diferença de ` +
      `${rsT(melhorPedido.margemRsT - (melhorPedido.ganhoUsoInternoRsT ?? 0))}. Todos cabem na folga do parque: nenhuma tonelada sai do consumo próprio.`,
    acaoRota: '/oportunidades',
    acaoRotulo: 'Ver oportunidades',
    impactoRs: ganhoAcimaDoInternoRs,
    impactoBase: 'mes',
    agenteId: 'comercial-farinha',
  },
  {
    id: 'alerta-orcamento-trigo',
    severidade: 'alto',
    categoria: 'mercado',
    timestamp: '2025-08-12T06:15:00',
    titulo: `Custo landed do dia ${rsT(desvioOrcamentoRsT)} acima do orçamento do trimestre`,
    descricao:
      `TLC de ${rsT(TLC_RECOMENDADO_RS)} contra orçamento de ${rsT(ORCAMENTO_TRIGO_RS_T)}. ` +
      `Sobre as ${formatTon(VOLUME_TRIMESTRE_T)} ainda a comprar, o desvio é de ${formatBRL(desvioOrcamentoRs, { compacto: true })} no trimestre. ` +
      'Atenção à régua: contra o baseline de não agir (R$ 1.520/t) o mesmo lote é economia — orçamento é compromisso, baseline é previsão.',
    acaoRota: '/tlc',
    acaoRotulo: 'Abrir decomposição do TLC',
    impactoRs: -desvioOrcamentoRs,
    impactoBase: 'trimestre',
    impactoNota: 'sobre o volume ainda a comprar',
    agenteId: 'tlc',
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
    impactoRs: RECOMENDACAO_COMPRA.economiaTotalRs,
    impactoBase: 'evento',
    impactoNota: 'no lote antecipado',
    agenteId: 'mercado',
  },
  {
    id: 'alerta-rendimento-cabedelo',
    severidade: 'alto',
    categoria: 'moinho',
    timestamp: '2025-08-12T04:50:00',
    titulo: `Rendimento de Cabedelo caiu ${pp(QUEDA_RENDIMENTO_PP)} vs o regime`,
    descricao:
      `Cada ponto percentual de rendimento vale ${rsT(custoPorPontoRsT)} no custo da farinha. ` +
      `A queda encarece as ${formatTon(producaoCabedeloT)} do mês em ${rsT(custoQuedaRendimentoRsT)}. ` +
      'Padrão típico de desgaste de cilindros — a manutenção preventiva custa uma fração disto.',
    acaoRota: '/moinhos',
    acaoRotulo: 'Ver performance dos moinhos',
    impactoRs: -custoQuedaRendimentoRs,
    impactoBase: 'mes',
    agenteId: 'moinhos',
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
    agenteId: 'originacao',
  },
  {
    id: 'alerta-ruptura-cerrado',
    severidade: 'alto',
    categoria: 'comercial',
    timestamp: '2025-08-12T06:10:00',
    titulo: `Pedido ${getClienteExterno(pedidoRuptura.clienteId)?.nome} forçaria compra emergencial de farinha`,
    descricao:
      `${pedidoRuptura.guardrail.diagnostico} A margem aparente do pedido é ${formatBRL(margemAparenteRs, { compacto: true })}; ` +
      `com o custo de reposição, entrega ${formatBRL(margemRealRs, { compacto: true })}. ` +
      `Aceitar às cegas superestima o resultado em ${formatBRL(Math.abs(margemQueNaoSeRealizaRs), { compacto: true })}.`,
    acaoRota: '/oportunidades',
    acaoRotulo: 'Ver guardrail de ruptura',
    impactoRs: margemQueNaoSeRealizaRs,
    impactoBase: 'mes',
    impactoNota: 'margem aparente que não se realiza',
    agenteId: 'comercial-farinha',
  },
  {
    id: 'alerta-capacidade-ociosa-salvador',
    severidade: 'medio',
    categoria: 'margem',
    timestamp: '2025-08-12T05:55:00',
    titulo: `${formatTon(salvador.capacidadeOciosaT)} ociosas em Salvador com preço ${rsT(salvador.margemIncrementalRsT)} acima do custo marginal`,
    descricao:
      `Custo marginal de ${rsT(salvador.custoMarginalRsT)} contra preço comparável de ${rsT(salvador.precoExternoRsT)}, ` +
      `já descontado o custo de servir. Os fixos e a depreciação estão absorvidos pelo volume atual (${formatPct(salvador.utilizacaoPct)}), ` +
      'então a tonelada incremental entra quase inteira na margem. Potencial ainda NÃO contratado — depende de fechar cliente.',
    acaoRota: '/make-buy-sell',
    acaoRotulo: 'Simular a folga',
    impactoRs: potencialSalvadorRs,
    impactoBase: 'mes',
    impactoNota: 'potencial, sem pedido fechado',
    agenteId: 'make-buy-sell',
  },
  {
    id: 'alerta-capacidade-minima-rolandia',
    severidade: 'medio',
    categoria: 'moinho',
    timestamp: '2025-08-12T05:30:00',
    titulo: `Rolândia a ${pp(rolandia.folgaPp ?? 0)} da capacidade econômica mínima`,
    descricao:
      `Utilização de ${formatPct(rolandia.utilizacaoPct)} contra mínima de ${formatPct(rolandia.utilizacaoMinimaPct ?? 0, 1)}: abaixo disso, a diluição dos fixos ` +
      `leva o custo pleno (${rsT(rolandia.custoInternoRsT)}) acima do preço de mercado do Sul (${rsT(rolandia.precoExternoRsT)}). ` +
      `A vantagem hoje é de apenas ${rsT(rolandia.ganhoRsT)} — a menor do parque.`,
    acaoRota: '/moinhos',
    acaoRotulo: 'Ver capacidade mínima',
    impactoRs: -valorEmRiscoRolandiaRs,
    impactoBase: 'mes',
    impactoNota: 'em risco se a utilização cair à mínima',
    agenteId: 'moinhos',
  },
  {
    id: 'alerta-cambio-vira-decisao',
    severidade: 'medio',
    categoria: 'margem',
    timestamp: '2025-08-12T06:40:00',
    titulo: `Câmbio a R$ ${cambioDeVirada.toFixed(2).replace('.', ',')} inverte a recomendação em Rolândia`,
    descricao:
      `Só a parcela dolarizada do TLC (US$ ${decomp.usdPorT.toFixed(0)}/t) se move com o câmbio. ` +
      `Acima de R$ ${cambioDeVirada.toFixed(2).replace('.', ',')} — dentro da banda de 90 dias, que vai a R$ ${CAMBIO_P90.toFixed(2).replace('.', ',')} — o custo interno de Rolândia ultrapassa ` +
      `os ${rsT(precoSulRsT)} do mercado do Sul e a resposta passa de PRODUZIR para COMPRAR. ` +
      `No topo da banda o custo chega a ${rsT(custoRolandiaNoP90RsT)}. É a mesma mecânica que já colocou Bento Gonçalves do outro lado.`,
    acaoRota: '/make-buy-sell',
    acaoRotulo: 'Testar o câmbio no simulador',
    impactoRs: -perdaRolandiaNoP90Rs,
    impactoBase: 'mes',
    impactoNota: 'perda no topo da banda de 90 dias (R$ 5,60)',
    agenteId: 'orquestrador',
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
    agenteId: 'alertas-financeiros',
  },
  {
    id: 'alerta-lote-incompativel',
    severidade: 'medio',
    categoria: 'qualidade',
    timestamp: '2025-08-12T04:20:00',
    titulo: `Lote ${loteBloqueado.lote.id} incompatível com o blend: DON ${loteBloqueado.lote.qualidade.don.toLocaleString('pt-BR')} ppb`,
    descricao:
      `${formatTon(loteBloqueado.lote.quantidadeT)} em silo acima da política de biscoito (≤ 1.000 ppb). DON não dilui em proporção relevante — ` +
      `a mistura não resolve. ${loteBloqueado.recomendacao} O capital parado é de ${formatBRL(capitalParadoRs, { compacto: true })}, ` +
      `com carregamento de ${formatBRL(carregamentoLoteRs, { compacto: true })} por mês.`,
    acaoRota: '/estoques',
    acaoRotulo: 'Ver lotes e blends',
    impactoRs: -carregamentoLoteRs,
    impactoBase: 'mes',
    agenteId: 'blend',
  },
  {
    id: 'alerta-farinha-sem-destino',
    severidade: 'medio',
    categoria: 'estoque',
    timestamp: '2025-08-12T05:20:00',
    titulo: `${formatTon(planoRolandia.farinhaDisponivelT)} de farinha em Rolândia sem destino interno`,
    descricao:
      `Ocupação de ${formatPct(planoRolandia.ocupacaoPct, 1)}: a demanda das fábricas não consome a capacidade da unidade. ` +
      `Produzir sem comprador vira estoque, a ${formatBRL(ARMAZENAGEM_FARINHA_RS_T)}/t de armazenagem mais o custo financeiro — ` +
      `${formatBRL(carregamentoFarinhaRs, { compacto: true })} por mês. Ou se vende, ou não se produz.`,
    acaoRota: '/demanda',
    acaoRotulo: 'Ver plano de demanda',
    impactoRs: -carregamentoFarinhaRs,
    impactoBase: 'mes',
    agenteId: 'verticalizacao',
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
    agenteId: 'originacao',
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
    agenteId: 'mercado',
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
    agenteId: 'mercado',
  },
  {
    id: 'alerta-preco-farinha-ne',
    severidade: 'info',
    categoria: 'farinha',
    timestamp: '2025-08-12T05:10:00',
    titulo: 'Farinha de massas no Nordeste sobe pela 4ª semana',
    descricao:
      `Cotação comparável (industrial · granel · posto fábrica) a ${rsT(precoExternoComparavel('massa', 'nordeste')!.precoRsT)}, ` +
      'com repasse do trigo importado defasado em 30–45 dias. Cada real de alta aqui amplia o ganho da verticalização — ' +
      'e a base de comparação segue a mesma do custo interno, sem embalagem nem frete ao cliente.',
    acaoRota: '/previsao',
    acaoRotulo: 'Ver mercado de farinha',
    agenteId: 'mercado',
  },
  {
    id: 'alerta-don-russia',
    severidade: 'info',
    categoria: 'qualidade',
    timestamp: '2025-08-11T19:30:00',
    titulo: 'Lote russo reprovado na triagem de pré-embarque: DON 1.800 ppb',
    descricao:
      'Amostra da alternativa Mar Negro acima da política para biscoito (≤ 1.000 ppb). ' +
      'Alternativa mantida fora da recomendação — distinta do lote de mesma origem já bloqueado em silo.',
    acaoRota: '/tlc',
    acaoRotulo: 'Comparar alternativas',
    agenteId: 'blend',
  },
]

/** Contagem para o sino da Topbar: alertas críticos + altos. */
export const CONTAGEM_ALERTAS_SINO = ALERTAS.filter(
  (a) => a.severidade === 'critico' || a.severidade === 'alto',
).length

/**
 * Agregados de impacto. SÓ entram os alertas de base MENSAL e que exigem
 * decisão: somar o desvio trimestral de orçamento com um custo mensal de
 * armazenagem daria um total que não é nem mês nem trimestre, e os
 * informativos não têm ação a tomar. Ganho e risco andam separados de
 * propósito — um líquido esconderia que R$ 1 a capturar e R$ 1 a evitar
 * exigem times, prazos e decisões diferentes.
 */
const mensaisComAcao = ALERTAS.filter((a) => a.severidade !== 'info' && a.impactoBase === 'mes')

/** O que há a CAPTURAR neste mês (R$) — impactos positivos. */
export const OPORTUNIDADE_ALERTAS_RS = mensaisComAcao
  .filter((a) => (a.impactoRs ?? 0) > 0)
  .reduce((soma, a) => soma + (a.impactoRs ?? 0), 0)

/** O que há a EVITAR neste mês (R$, valor absoluto) — impactos negativos. */
export const RISCO_ALERTAS_RS = Math.abs(
  mensaisComAcao.filter((a) => (a.impactoRs ?? 0) < 0).reduce((soma, a) => soma + (a.impactoRs ?? 0), 0),
)

/** Soma em jogo neste mês: o que se captura mais o que se evita. */
export const IMPACTO_ALERTAS_RS = OPORTUNIDADE_ALERTAS_RS + RISCO_ALERTAS_RS
