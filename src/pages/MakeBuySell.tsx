import { memo, useCallback, useMemo, useState } from 'react'
import { Check, RotateCcw, Scale, SlidersHorizontal } from 'lucide-react'
import { Card, KpiTile, Pill, SectionTitle } from '../components/ui'
import { AnimatedNumber } from '../components/live/AnimatedNumber'
import { SourceBadge } from '../components/trust/SourceBadge'
import { WhyPopover } from '../components/trust/WhyPopover'
import { emitirToast } from '../components/feedback/toastBus'
import {
  ECONOMIA_MOAGEM,
  FARINHAS,
  MOINHOS,
  formatBRL,
  formatTon,
  getFarinha,
  getMoinho,
  type AlternativaMbs,
  type FarinhaId,
  type MoinhoId,
} from '../data'
import {
  PERFIS_POSTURA_MBS,
  inputsIniciais,
  matrizDecisao,
  simularMakeBuySell,
  type AlternativaSimulada,
  type InputsSimuladorMbs,
  type NivelRisco,
} from '../data/simuladorMbs'

/**
 * Simulador Make/Buy/Sell — o centro da tese v2.
 *
 * Tudo recalcula ao vivo a partir dos sliders, e nada é digitado: o custo da
 * farinha vem do motor econômico, que por sua vez puxa o TLC do trigo do elo 1.
 * Mexer no câmbio move o custo do trigo de verdade — só a parcela dolarizada.
 */

const rs1 = (v: number) => formatBRL(v, { casas: 1 })
const rs0 = (v: number) => formatBRL(v)

const TOM_RISCO: Record<NivelRisco, { rotulo: string; classe: string }> = {
  baixo: { rotulo: 'Risco baixo', classe: 'border-positive/40 bg-positive/10 text-positive' },
  medio: { rotulo: 'Risco médio', classe: 'border-warning/40 bg-warning/10 text-warning' },
  alto: { rotulo: 'Risco alto', classe: 'border-danger/40 bg-danger/10 text-danger' },
}

const COR_FATIA: Record<string, string> = {
  gold: 'bg-gold',
  info: 'bg-info',
  positive: 'bg-positive',
  faint: 'bg-ink-faint/40',
}

const Slider = memo(function Slider({
  rotulo,
  valor,
  valorFmt,
  min,
  max,
  step,
  hint,
  onChange,
}: {
  rotulo: string
  valor: number
  valorFmt: string
  min: number
  max: number
  step: number
  hint?: string
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-ink">{rotulo}</span>
        <span className="tnums font-mono text-xs font-semibold text-gold-light">{valorFmt}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valor}
        aria-label={rotulo}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-gold"
      />
      {hint && <span className="tnums mt-0.5 block text-[10px] text-ink-subtle">{hint}</span>}
    </label>
  )
})

const CardAlternativa = memo(function CardAlternativa({
  alt,
  selo,
  detalhe,
}: {
  alt: AlternativaSimulada
  /** Rótulo do selo de recomendação. null = não é a escolhida. */
  selo: string | null
  detalhe?: string
}) {
  const risco = TOM_RISCO[alt.risco]
  return (
    <Card
      variant={selo ? 'gold' : 'default'}
      className={`flex flex-col ${alt.viavel ? '' : 'opacity-70'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-13 font-semibold text-ink">{alt.rotulo}</p>
        {selo && (
          <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">
            {selo}
          </span>
        )}
      </div>

      <p className="tnums mt-3 font-display text-28 font-semibold leading-none text-ink">
        <AnimatedNumber valor={alt.resultadoRsT} formatar={(v) => rs1(v)} />
        <span className="ml-1 font-sans text-13 font-medium text-ink-subtle">/t</span>
      </p>
      <p className="tnums mt-1.5 font-mono text-12 text-ink-muted">
        <AnimatedNumber valor={alt.resultadoRs} formatar={(v) => rs0(Math.round(v))} /> no mês ·{' '}
        {formatTon(alt.volumeT)}
      </p>

      <p className="mt-3 text-11 leading-relaxed text-ink-subtle">{alt.nota}</p>
      {detalhe && <p className="mt-1.5 text-11 leading-relaxed text-ink-subtle">{detalhe}</p>}

      <div className="mt-auto flex items-center gap-2 pt-3">
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${risco.classe}`}
        >
          {risco.rotulo}
        </span>
        <WhyPopover
          titulo={`${alt.rotulo} — risco`}
          explicacao={alt.motivoRisco}
          linhas={[
            { rotulo: 'Resultado unitário', valor: `${rs1(alt.resultadoRsT)}/t` },
            { rotulo: 'Volume aplicável', valor: formatTon(alt.volumeT) },
            { rotulo: 'Resultado no mês', valor: rs0(alt.resultadoRs), destaque: true },
          ]}
        />
      </div>
    </Card>
  )
})

/**
 * Par-âncora resolvido UMA vez, no módulo. Antes isto era
 * `useState(inputsIniciais().moinhoId)`: o argumento de useState é avaliado a
 * cada render mesmo quando só o primeiro conta, então cada movimento de
 * deslizador reconstruía o objeto de inputs — com as chamadas de motor que ele
 * faz — duas vezes, para jogar fora as duas.
 */
const PAR_INICIAL = inputsIniciais()

export default function MakeBuySell() {
  const [moinhoId, setMoinhoId] = useState<MoinhoId>(PAR_INICIAL.moinhoId)
  const [farinhaId, setFarinhaId] = useState<FarinhaId>(PAR_INICIAL.farinhaId)
  const [inputs, setInputs] = useState<InputsSimuladorMbs>(PAR_INICIAL)
  const [aplicado, setAplicado] = useState(false)

  /**
   * Identidade estável: sem useCallback, `set` era uma função nova a cada
   * render e os nove deslizadores (todos memoizados por props) re-renderizavam
   * juntos a cada tick de arraste. Com ela, só o deslizador movido re-renderiza.
   */
  const set = useCallback(
    <K extends keyof InputsSimuladorMbs>(chave: K, valor: InputsSimuladorMbs[K]) => {
      setInputs((atual) => (atual[chave] === valor ? atual : { ...atual, [chave]: valor }))
      setAplicado(false)
    },
    [],
  )

  const trocarPar = useCallback((novoMoinho: MoinhoId, novaFarinha: FarinhaId) => {
    setMoinhoId(novoMoinho)
    setFarinhaId(novaFarinha)
    setInputs(inputsIniciais(novoMoinho, novaFarinha))
    setAplicado(false)
  }, [])

  const resetar = useCallback(() => {
    setInputs(inputsIniciais(moinhoId, farinhaId))
    setAplicado(false)
  }, [moinhoId, farinhaId])

  const resultado = useMemo(() => simularMakeBuySell(inputs), [inputs])
  const matriz = useMemo(() => matrizDecisao(resultado), [resultado])
  const moinho = getMoinho(moinhoId)!
  const farinha = getFarinha(farinhaId)!
  const inicial = useMemo(() => inputsIniciais(moinhoId, farinhaId), [moinhoId, farinhaId])
  const alterado = JSON.stringify(inputs) !== JSON.stringify(inicial)

  const principais = resultado.alternativas.filter((a) => a.principal)
  const secundarias = resultado.alternativas.filter((a) => !a.principal)
  const aloc = resultado.alocacao
  const totalAlocadoT = aloc.fatias.reduce((s, f) => s + f.toneladas, 0)
  const vendendoT = aloc.fatias.find((f) => f.chave === 'produzir-vender')?.toneladas ?? 0

  const detalheVenda =
    `Margem no custo pleno: ${rs1(resultado.margemVendaPlenaRsT)}/t — a leitura de P&L. ` +
    `A de cima é a incremental, contra o custo marginal, que é o que decide usar capacidade ociosa.`

  const aplicar = () => {
    setAplicado(true)
    emitirToast({
      tom: 'sucesso',
      titulo: 'Cenário aplicado',
      descricao: `${moinho.nome} · ${farinha.nome}: ${rs0(resultado.beneficioRs)}/mês de benefício. Ecoa na Visão Executiva e na Compra.`,
    })
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Margem & Decisão"
        title="Simulador Make/Buy/Sell"
        subtitle="Moer, comprar pronta ou vender: as alternativas medidas contra a mesma referência de mercado, recalculadas ao vivo a partir do TLC do trigo."
        actions={<SourceBadge familia="estoque" />}
      />

      {/* Par em decisão + inputs */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] xl:items-start">
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="eyebrow flex items-center gap-1.5">
                <SlidersHorizontal size={12} className="text-gold" aria-hidden="true" />
                Cenário
              </p>
              <h2 className="mt-1 font-display text-16 font-semibold text-ink">
                {moinho.nome} · {farinha.nome}
              </h2>
            </div>
            <button
              type="button"
              onClick={resetar}
              disabled={!alterado}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-11 font-semibold text-ink-muted transition-colors enabled:hover:border-edge-strong enabled:hover:text-ink disabled:opacity-40"
            >
              <RotateCcw size={12} aria-hidden="true" /> Resetar
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-ink">Moinho</span>
              <select
                value={moinhoId}
                onChange={(e) => trocarPar(e.target.value as MoinhoId, farinhaId)}
                className="mt-1.5 w-full rounded-card border border-edge bg-card-2 px-2.5 py-2 text-xs text-ink focus-visible:border-gold/60"
              >
                {MOINHOS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}/{m.uf}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink">Farinha</span>
              <select
                value={farinhaId}
                onChange={(e) => trocarPar(moinhoId, e.target.value as FarinhaId)}
                className="mt-1.5 w-full rounded-card border border-edge bg-card-2 px-2.5 py-2 text-xs text-ink focus-visible:border-gold/60"
              >
                {FARINHAS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-3.5 border-t border-edge/60 pt-4">
            <Slider
              rotulo="Preço da farinha externa"
              valor={inputs.precoExternoRsT}
              valorFmt={`${rs0(inputs.precoExternoRsT)}/t`}
              min={1800}
              max={3000}
              step={10}
              hint="Mesma spec, canal industrial, granel, posto fábrica"
              onChange={(v) => set('precoExternoRsT', v)}
            />
            <Slider
              rotulo="Preço de venda (líquido)"
              valor={inputs.precoVendaRsT}
              valorFmt={`${rs0(inputs.precoVendaRsT)}/t`}
              min={1800}
              max={3200}
              step={10}
              onChange={(v) => set('precoVendaRsT', v)}
            />
            <Slider
              rotulo="Câmbio"
              valor={inputs.cambio}
              valorFmt={`R$ ${inputs.cambio.toFixed(2).replace('.', ',')}`}
              min={4}
              max={8}
              step={0.05}
              hint={`Trigo posto no moinho: ${rs1(resultado.custos.tlcTrigoRsT)}/t`}
              onChange={(v) => set('cambio', v)}
            />
            <Slider
              rotulo="Choque no custo do trigo"
              valor={inputs.choqueTrigoRsT}
              valorFmt={`${inputs.choqueTrigoRsT >= 0 ? '+' : '−'}${rs0(Math.abs(inputs.choqueTrigoRsT))}/t`}
              min={-300}
              max={400}
              step={10}
              hint="Prêmio de origem, frete marítimo ou quebra de safra, sobre o câmbio"
              onChange={(v) => set('choqueTrigoRsT', v)}
            />
            <Slider
              rotulo="Demanda interna"
              valor={inputs.demandaT}
              valorFmt={formatTon(inputs.demandaT)}
              min={0}
              max={24000}
              step={200}
              onChange={(v) => set('demandaT', v)}
            />
            <Slider
              rotulo="Capacidade disponível"
              valor={inputs.capacidadeT}
              valorFmt={formatTon(inputs.capacidadeT)}
              min={0}
              max={24000}
              step={200}
              onChange={(v) => set('capacidadeT', v)}
            />
            <Slider
              rotulo="Demanda externa acessível"
              valor={inputs.demandaExternaT}
              valorFmt={formatTon(inputs.demandaExternaT)}
              min={0}
              max={8000}
              step={100}
              hint="Teto da venda: capacidade ociosa só vira margem se houver comprador"
              onChange={(v) => set('demandaExternaT', v)}
            />
            <Slider
              rotulo="Custo de servir (frete + comissão)"
              valor={inputs.custoServirRsT}
              valorFmt={`${rs0(inputs.custoServirRsT)}/t`}
              min={0}
              max={400}
              step={5}
              onChange={(v) => set('custoServirRsT', v)}
            />
            <Slider
              rotulo="Margem mínima para vender"
              valor={inputs.margemMinimaRsT}
              valorFmt={`${rs0(inputs.margemMinimaRsT)}/t`}
              min={0}
              max={600}
              step={10}
              hint="Política comercial: abaixo disso a venda não é aprovada"
              onChange={(v) => set('margemMinimaRsT', v)}
            />
          </div>
        </Card>

        <div className="space-y-4">
          {/* As três alternativas principais */}
          <div className="grid gap-4 md:grid-cols-3">
            {principais.map((alt) => (
              <CardAlternativa
                key={alt.alternativa}
                alt={alt}
                selo={
                  alt.alternativa === resultado.recomendada
                    ? 'Para a demanda'
                    : alt.alternativa === 'produzir-vender' && vendendoT > 0
                      ? 'Para a folga'
                      : null
                }
                detalhe={alt.alternativa === 'produzir-vender' ? detalheVenda : undefined}
              />
            ))}
          </div>

          {/* Secundárias */}
          <div className="grid gap-3 sm:grid-cols-2">
            {secundarias.map((alt) => (
              <div
                key={alt.alternativa}
                className="rounded-card border border-edge/70 bg-card-2 p-3.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-12 font-semibold text-ink-muted">{alt.rotulo}</p>
                  <span
                    className={`tnums shrink-0 font-mono text-13 font-semibold ${alt.resultadoRsT >= 0 ? 'text-ink' : 'text-danger'}`}
                  >
                    {rs1(alt.resultadoRsT)}/t
                  </span>
                </div>
                <p className="mt-1.5 text-11 leading-relaxed text-ink-subtle">{alt.nota}</p>
              </div>
            ))}
          </div>

          {/* Alocação de capacidade */}
          <Card className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="eyebrow">Alocação da capacidade</p>
                <h2 className="mt-1 font-display text-16 font-semibold text-ink">
                  Onde cada tonelada rende mais
                </h2>
              </div>
              {aloc.capacidadeRestrita && aloc.custoReposicaoRsT != null && (
                <Pill tone="warning">Custo de reposição {rs0(aloc.custoReposicaoRsT)}/t</Pill>
              )}
            </div>

            <div
              className="flex h-9 w-full overflow-hidden rounded-card border border-edge"
              role="img"
              aria-label={`Alocação de ${formatTon(totalAlocadoT)}: ${aloc.fatias.map((f) => `${f.rotulo} ${formatTon(f.toneladas)}`).join(', ')}.`}
            >
              {aloc.fatias.map((f) => (
                <div
                  key={f.chave}
                  className={`flex items-center justify-center transition-[width] duration-500 ease-out motion-reduce:transition-none ${COR_FATIA[f.cor]}`}
                  style={{ width: `${(f.toneladas / Math.max(1, totalAlocadoT)) * 100}%` }}
                  title={`${f.rotulo}: ${formatTon(f.toneladas)}`}
                >
                  {f.toneladas / Math.max(1, totalAlocadoT) > 0.12 && (
                    <span
                      className={`tnums truncate px-2 font-mono text-11 font-semibold ${f.cor === 'faint' ? 'text-ink-muted' : 'text-navy'}`}
                    >
                      {formatTon(f.toneladas)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <ul className="grid gap-2 sm:grid-cols-2">
              {aloc.fatias.map((f) => (
                <li key={f.chave} className="flex items-baseline gap-2 text-12">
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-sm ${COR_FATIA[f.cor]}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 text-ink-muted">{f.rotulo}</span>
                  <span className="tnums shrink-0 font-mono text-ink">
                    {rs1(f.unitarioRsT)}/t · {rs0(f.totalRs)}
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-11 leading-relaxed text-ink-subtle">{aloc.racional}</p>
          </Card>
        </div>
      </div>

      {/* Impacto consolidado */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <Card variant="gold" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow flex items-center gap-1.5">
                <Scale size={12} className="text-gold" aria-hidden="true" />
                Impacto consolidado
              </p>
              <p className="tnums mt-2 font-display text-40 font-semibold leading-none text-ink">
                <AnimatedNumber valor={resultado.beneficioRs} formatar={(v) => rs0(Math.round(v))} />
                <span className="ml-1.5 font-sans text-16 font-medium text-ink-subtle">/mês</span>
              </p>
              <p className="mt-1.5 text-12 text-ink-muted">
                Benefício da decisão sobre moer tudo sem avaliar ·{' '}
                <span className="tnums font-mono">{resultado.efeitoMargemPct.toFixed(1).replace('.', ',')}%</span>{' '}
                do valor da farinha do mês
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <WhyPopover
                titulo="Benefício Make/Buy/Sell"
                explicacao="Compara a alocação escolhida com a alternativa ingênua — moer tudo que couber sem checar se compensa e sem vender nada. É o valor que a decisão acrescenta, e por isso continua positivo quando a resposta certa é comprar."
                linhas={[
                  { rotulo: 'Alocação escolhida', valor: `${rs0(aloc.resultadoRs)}/mês` },
                  { rotulo: 'Moer tudo sem avaliar', valor: `${rs0(aloc.resultadoIngenuoRs)}/mês` },
                  { rotulo: 'Benefício da decisão', valor: `${rs0(resultado.beneficioRs)}/mês`, destaque: true },
                ]}
                familia="estoque"
              />
              <button
                type="button"
                onClick={aplicar}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  aplicado
                    ? 'bg-positive/15 text-positive'
                    : 'bg-gold text-navy hover:bg-gold-light'
                }`}
              >
                {aplicado ? <Check size={13} aria-hidden="true" /> : null}
                {aplicado ? 'Aplicado' : 'Aplicar'}
              </button>
            </div>
          </div>

          {/* Régua de postura */}
          <div className="grid gap-3 sm:grid-cols-3">
            {PERFIS_POSTURA_MBS.map((p) => (
              <div
                key={p.id}
                className={`rounded-card border p-3 ${
                  p.fator === 1 ? 'border-gold/50 bg-gold/10' : 'border-edge/70 bg-card-2'
                }`}
              >
                <p className="text-11 font-semibold text-ink-subtle">{p.rotulo}</p>
                <p className="tnums mt-1 font-display text-16 font-semibold text-ink">
                  {rs0(Math.round(resultado.beneficioRs * p.fator))}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-ink-subtle">{p.nota}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <KpiTile
            label="Custo da farinha simulado"
            value={<AnimatedNumber valor={resultado.custos.custoInternoRsT} formatar={(v) => rs1(v)} />}
            unit="/t"
            hint={`Trigo a ${rs1(resultado.custos.tlcTrigoRsT)}/t · marginal ${rs1(resultado.custos.custoMarginalRsT)}/t`}
            delta={
              resultado.custos.deltaVsRegimeRsT !== 0
                ? {
                    label: `${rs1(Math.abs(resultado.custos.deltaVsRegimeRsT))}/t vs regime`,
                    direction: resultado.custos.deltaVsRegimeRsT > 0 ? 'up' : 'down',
                    tone: resultado.custos.deltaVsRegimeRsT > 0 ? 'danger' : 'positive',
                  }
                : undefined
            }
            fonte={
              <WhyPopover
                titulo="Custo da farinha sob os inputs"
                explicacao="O câmbio move só a parcela dolarizada do TLC (FOB, prêmio, frete marítimo, seguro, taxas e imposto); despesas portuárias, frete interno e custo de capital já nascem em reais. O choque soma por cima. Conversão, energia, perdas, depreciação e crédito do farelo são da unidade e não mudam com preço de mercado."
                linhas={[
                  { rotulo: 'Trigo posto no moinho', valor: `${rs1(resultado.custos.tlcTrigoRsT)}/t` },
                  { rotulo: 'Rendimento', valor: `${resultado.custos.rendimentoPct.toFixed(1).replace('.', ',')}%` },
                  { rotulo: 'Crédito do farelo', valor: `−${rs1(resultado.custos.creditoFareloRsT)}/t` },
                  { rotulo: 'Custo pleno', valor: `${rs1(resultado.custos.custoInternoRsT)}/t`, destaque: true },
                ]}
                familia="estoque"
              />
            }
          />
          <KpiTile
            label="Margem da venda externa"
            value={<AnimatedNumber valor={aloc.margemVendaEfetivaRsT} formatar={(v) => rs1(v)} />}
            unit="/t"
            hint={
              aloc.capacidadeRestrita
                ? 'Contra o custo de reposição (capacidade restrita)'
                : `Contra o custo marginal · ${rs1(resultado.margemVendaPlenaRsT)}/t no custo pleno`
            }
            delta={{
              label: `mínima ${rs0(inputs.margemMinimaRsT)}/t`,
              direction: aloc.margemVendaEfetivaRsT >= inputs.margemMinimaRsT ? 'up' : 'down',
              tone: aloc.margemVendaEfetivaRsT >= inputs.margemMinimaRsT ? 'positive' : 'danger',
            }}
          />
        </div>
      </div>

      {/* Matriz de decisão */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-16 font-semibold text-ink">Matriz de decisão</h2>
          <p className="text-11 text-ink-subtle">
            As linhas em destaque são as situações que valem no cenário simulado agora
          </p>
        </div>
        <div className="overflow-x-auto rounded-card-lg border border-edge/80 bg-card shadow-card">
          <table className="w-full border-collapse text-sm" style={{ minWidth: 780 }}>
            <caption className="sr-only">
              Dez situações de Make/Buy/Sell, a decisão recomendada para cada uma e a evidência
              numérica do cenário simulado. As linhas ativas correspondem à situação atual.
            </caption>
            <thead>
              <tr className="border-b border-edge/80">
                {['Situação', 'Decisão', 'Evidência no cenário'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-[var(--cell-px)] py-[var(--cell-py)] text-left text-[11px] font-semibold uppercase tracking-wide text-ink-subtle"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matriz.map((linha) => (
                <tr
                  key={linha.id}
                  className={`border-b border-edge/40 last:border-b-0 ${
                    linha.ativa ? '[&>td]:bg-gold/[0.09]' : ''
                  }`}
                >
                  <td className="px-[var(--cell-px)] py-[var(--cell-py)] align-top">
                    <span className="flex items-start gap-2">
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${linha.ativa ? 'bg-gold' : 'bg-edge-strong'}`}
                        aria-hidden="true"
                      />
                      <span className={linha.ativa ? 'font-medium text-ink' : 'text-ink-muted'}>
                        {linha.situacao}
                      </span>
                    </span>
                  </td>
                  <td className="px-[var(--cell-px)] py-[var(--cell-py)] align-top">
                    <span className={linha.ativa ? 'font-semibold text-gold-light' : 'text-ink-muted'}>
                      {linha.decisao}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-relaxed text-ink-subtle">
                      {linha.porque}
                    </span>
                  </td>
                  <td className="tnums px-[var(--cell-px)] py-[var(--cell-py)] align-top font-mono text-11 text-ink-subtle">
                    {linha.evidencia}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-11 leading-relaxed text-ink-subtle">
          Mais de uma linha pode valer ao mesmo tempo: a matriz descreve situações, e a alocação acima é
          quem concilia as regras em uma única decisão. O custo de servir padrão é{' '}
          {rs0(ECONOMIA_MOAGEM.custoServirRsT)}/t.
        </p>
      </div>
    </div>
  )
}

export type { AlternativaMbs }
