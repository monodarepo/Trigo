import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { useDecisao } from '../components/approval/decisionStore'
import { snapshot, formatBRL, formatPct, formatTon, formatUSD } from '../data'

/**
 * One-pager de exportação: página clara, otimizada para impressão/PDF
 * (window.print + CSS de impressão dedicado), com o logo original.
 * Pronta para anexar num fluxo de aprovação por e-mail/workflow.
 */

const rec = snapshot.recomendacaoDoDia
const { tlc, simulador, governancaDados } = snapshot
const fmtCambio = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`
const fmtDelta = (v: number) => `${v < 0 ? '−' : '+'}${formatBRL(Math.abs(v), { compacto: true })}`
const valorLoteRs = rec.compra.volumeToneladas * rec.compra.tlcRs
const perfis = ['conservador', 'recomendado', 'oportunistico'] as const

const ROTULO_DECISAO = {
  aprovada: 'APROVADA',
  ajustada: 'AJUSTADA PELA MESA',
  encaminhada: 'ENCAMINHADA',
} as const

export default function ExportOnePager() {
  const decisao = useDecisao()

  return (
    <div className="min-h-screen bg-slate-200 font-sans text-slate-900">
      {/* Barra de ações (não sai na impressão) */}
      <div className="no-print sticky top-0 z-10 border-b border-slate-300 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-3 px-4 py-2.5">
          <Link to="/" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft size={14} aria-hidden="true" /> Voltar ao Hub
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-amber-400"
          >
            <Printer size={14} aria-hidden="true" /> Imprimir / salvar PDF
          </button>
        </div>
      </div>

      {/* A folha */}
      <div className="one-pager mx-auto my-6 max-w-[210mm] border border-slate-300 bg-white p-10 shadow-xl">
        {/* Cabeçalho */}
        <header className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
          <img src="/brand/mdias-logo-recorte.png" alt="M. Dias Branco" className="h-10 w-auto" />
          <div className="text-right">
            <p className="font-display text-lg font-semibold leading-tight">Recomendação do dia — Hub de Trigo</p>
            <p className="tnums mt-0.5 text-xs text-slate-500">Terça, 12 de agosto de 2025 · 07:00 · Torre de Controle do Trigo</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Confidencial · uso interno
            </p>
          </div>
        </header>

        {/* Recomendação + status */}
        <section className="mt-5">
          <div className="flex items-start justify-between gap-4">
            <h1 className="max-w-[62%] font-display text-base font-semibold leading-snug">{rec.resumo}</h1>
            <div
              className={`shrink-0 rounded border px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide ${
                decisao
                  ? decisao.modo === 'aprovada'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                    : 'border-amber-600 bg-amber-50 text-amber-700'
                  : 'border-slate-400 bg-slate-50 text-slate-500'
              }`}
            >
              {decisao ? `${ROTULO_DECISAO[decisao.modo]} · ${decisao.horaRotulo}` : 'PENDENTE DE APROVAÇÃO'}
            </div>
          </div>
          <dl className="tnums mt-4 grid grid-cols-3 gap-x-4 gap-y-3 rounded border border-slate-300 bg-slate-50 p-4 text-xs sm:grid-cols-6">
            {[
              ['Volume', `${formatTon(rec.compra.volumeToneladas)}`, `janela de ${rec.compra.janelaDias} dias`],
              ['Origem · Porto', 'Argentina · Pecém', `blend ${rec.compra.blend.map((b) => b.pct).join('/')}`],
              ['TLC', `${formatBRL(rec.compra.tlcRs)}/t`, `vs ${formatBRL(rec.compra.baselineRs)}/t baseline`],
              ['Economia', `${formatBRL(rec.compra.economiaTotalRs, { compacto: true })}`, `${formatBRL(rec.compra.tlcRs - rec.compra.baselineRs)}/t`],
              ['Hedge', formatPct(rec.hedge.coberturaAlvoPct), `NDF ${formatUSD(rec.hedge.notionalNovoUsd, { compacto: true })} a ${fmtCambio(rec.hedge.taxaForwardMedia)}`],
              ['Impacto protegido', formatBRL(rec.impactoProtegidoRs, { compacto: true }), 'compra + hedge'],
            ].map(([rotulo, valor, hint]) => (
              <div key={rotulo}>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{rotulo}</dt>
                <dd className="mt-0.5 font-display text-sm font-semibold">{valor}</dd>
                <dd className="text-[10px] text-slate-500">{hint}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Racional */}
        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">Por quê — compra</h2>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-700">{rec.compra.racional}</p>
          </div>
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">Por quê — hedge</h2>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-700">{rec.hedge.racional}</p>
            <p className="mt-2 rounded border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[10px] leading-snug text-slate-700">
              <span className="font-bold">Alçada:</span> lote de {formatBRL(valorLoteRs, { compacto: true })} · impacto de{' '}
              {formatBRL(rec.impactoProtegidoRs, { compacto: true })} — acima de R$ 1M, requer Finanças + Supply.
              {decisao?.comentario && (
                <>
                  {' '}
                  <span className="font-bold">Comentário da decisão:</span> “{decisao.comentario}”
                </>
              )}
              {decisao?.destino && (
                <>
                  {' '}
                  <span className="font-bold">Encaminhada para:</span> {decisao.destino}.
                </>
              )}
            </p>
          </div>
        </section>

        {/* TLC decomposto + cenários */}
        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">
              TLC decomposto — Argentina → Pecém → Fortaleza (R$/t)
            </h2>
            <table className="tnums mt-1.5 w-full border-collapse text-[10.5px]">
              <tbody>
                {tlc.componentes.map((c) => (
                  <tr key={c.rotulo} className="border-b border-slate-200">
                    <td className="py-0.5 pr-2 text-slate-600">{c.rotulo}</td>
                    <td className="py-0.5 text-right font-medium">{formatBRL(c.valorRs, { casas: 1 })}</td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-1 font-bold">TLC total (vs baseline {formatBRL(tlc.baselineRs)})</td>
                  <td className="pt-1 text-right font-display font-bold text-amber-700">{formatBRL(tlc.recomendadoRs)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">
              Cenários no trimestre (cenário-base: trigo +{formatPct(simulador.defaults.variacaoPrecoTrigoPct)} · câmbio +
              {formatPct(simulador.defaults.variacaoCambioPct, 1)})
            </h2>
            <table className="tnums mt-1.5 w-full border-collapse text-[10.5px]">
              <thead>
                <tr className="border-b border-slate-400 text-left text-[9.5px] uppercase tracking-wide text-slate-400">
                  <th className="py-1 font-semibold">Perfil</th>
                  <th className="py-1 text-right font-semibold">Δ CPV</th>
                  <th className="py-1 text-right font-semibold">EBITDA</th>
                  <th className="py-1 text-right font-semibold">FX residual</th>
                </tr>
              </thead>
              <tbody>
                {perfis.map((p) => {
                  const out = simulador.cenarioDefault.porPerfil[p]
                  const destaque = p === 'recomendado'
                  return (
                    <tr key={p} className={`border-b border-slate-200 ${destaque ? 'bg-amber-50 font-semibold' : ''}`}>
                      <td className="py-1">
                        {simulador.perfis[p].rotulo}
                        {destaque && <span className="ml-1 text-[9px] font-bold uppercase text-amber-600">← recomendado</span>}
                      </td>
                      <td className="py-1 text-right">{fmtDelta(out.deltaVsBaselineRs)}</td>
                      <td className="py-1 text-right">
                        {out.impactoMargemEbitdaPp >= 0 ? '+' : '−'}
                        {Math.abs(out.impactoMargemEbitdaPp).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} p.p.
                      </td>
                      <td className="py-1 text-right">{formatUSD(out.exposicaoResidualUsd, { compacto: true })}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-2 text-[10px] leading-snug text-slate-500">
              Probabilidade de alta do trigo em 15 dias: {formatPct(rec.probAlta15dPct)}. Antecipar{' '}
              {formatPct(rec.compra.anteciparPctTrimestre)} e proteger {formatPct(rec.hedge.coberturaAlvoPct)} equilibra
              custo e risco — menor CPV que o conservador, exposição residual controlada.
            </p>
          </div>
        </section>

        {/* Assinaturas */}
        <section className="mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">Aprovações</h2>
          <div className="mt-6 grid grid-cols-3 gap-6">
            {['Compras (CPO)', 'Finanças (CFO)', 'Supply (diretoria)'].map((papel) => (
              <div key={papel} className="text-center">
                <div className="border-t border-slate-400 pt-1.5 text-[10px] font-medium text-slate-600">{papel}</div>
                <p className="mt-0.5 text-[9px] text-slate-400">Nome · assinatura · data ____/____/2025</p>
              </div>
            ))}
          </div>
        </section>

        {/* Rodapé */}
        <footer className="mt-6 border-t border-slate-300 pt-3">
          <p className="text-[9px] leading-relaxed text-slate-400">
            Fontes:{' '}
            {governancaDados.fontesLista
              .map((f) => `${f.fonteCurta} (${f.metodo === 'tempo-real' ? 'tempo real' : f.frescorRotulo})`)
              .join(' · ')}
            . Números do snapshot de terça, 12 ago 2025 · 07:00 — a mesma verdade exibida no Hub.
          </p>
          <p className="mt-1 text-[9px] font-medium text-slate-400">
            Gerado pelo Hub de Trigo (mockup navegável, sem backend) · M. Dias Branco · Monoda × Google Cloud
          </p>
        </footer>
      </div>
    </div>
  )
}
