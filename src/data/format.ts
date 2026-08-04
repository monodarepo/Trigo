/**
 * Helpers de formatação pt-BR. Datas são tratadas como calendário puro
 * (sem fuso): strings ISO são decompostas manualmente para evitar
 * deslocamento de dia por timezone.
 */

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function numeroPt(valor: number, casas = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor)
}

/** Até 1 casa decimal, sem zero à direita: 4,8 · 72 · 1,1. */
function numeroCompacto(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(valor)
}

/** "R$ 1.480" · compacto: "R$ 4,8M", "R$ 1,1 bi", "R$ 560 mil". */
export function formatBRL(valor: number, opts: { compacto?: boolean; casas?: number } = {}): string {
  const abs = Math.abs(valor)
  if (opts.compacto) {
    if (abs >= 1e9) return `R$ ${numeroCompacto(valor / 1e9)} bi`
    if (abs >= 1e6) return `R$ ${numeroCompacto(valor / 1e6)}M`
    if (abs >= 1e3) return `R$ ${numeroPt(valor / 1e3, 0)} mil`
  }
  return `R$ ${numeroPt(valor, opts.casas ?? 0)}`
}

/** "US$ 253" · compacto: "US$ 72M". */
export function formatUSD(valor: number, opts: { compacto?: boolean; casas?: number } = {}): string {
  const abs = Math.abs(valor)
  if (opts.compacto) {
    if (abs >= 1e9) return `US$ ${numeroCompacto(valor / 1e9)} bi`
    if (abs >= 1e6) return `US$ ${numeroCompacto(valor / 1e6)}M`
    if (abs >= 1e3) return `US$ ${numeroPt(valor / 1e3, 0)} mil`
  }
  return `US$ ${numeroPt(valor, opts.casas ?? 0)}`
}

/** "72%", "10,6%" (casas=1). Não multiplica: recebe o valor já em pontos percentuais. */
export function formatPct(valor: number, casas = 0): string {
  return `${numeroPt(valor, casas)}%`
}

/** "32.000 t". */
export function formatTon(valor: number): string {
  return `${numeroPt(valor)} t`
}

function partesData(iso: string): { ano: number; mes: number; dia: number; hora?: string } {
  const [dataParte, horaParte] = iso.split('T')
  const [ano, mes, dia] = dataParte.split('-').map(Number)
  return { ano, mes, dia, hora: horaParte?.slice(0, 5) }
}

/** "12 ago" · com ano: "12 ago 2025". */
export function formatDataPt(iso: string, opts: { comAno?: boolean } = {}): string {
  const { ano, mes, dia } = partesData(iso)
  const base = `${dia} ${MESES_ABREV[mes - 1]}`
  return opts.comAno ? `${base} ${ano}` : base
}

/** "Terça, 12 ago · 07:00" (hora omitida se a ISO não tiver horário). */
export function formatDataHoraPt(iso: string): string {
  const { ano, mes, dia, hora } = partesData(iso)
  const diaSemana = DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()]
  const base = `${diaSemana}, ${dia} ${MESES_ABREV[mes - 1]}`
  return hora ? `${base} · ${hora}` : base
}
