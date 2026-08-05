import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Newspaper, SendHorizontal, Sparkles } from 'lucide-react'
import { Badge, Card, DataTable, Pill, RecommendationCard, SectionTitle, type DataTableColumn } from '../components/ui'
import { useNoticiasAoVivo } from '../live/useLiveData'
import {
  snapshot,
  type PerguntaResposta,
  type ReferenciaCopiloto,
  type RespostaRicaCopiloto,
} from '../data'

const { copiloto } = snapshot

interface ItemChat {
  id: string
  autor: 'usuario' | 'copiloto'
  texto?: string
  rica?: RespostaRicaCopiloto
  simples?: PerguntaResposta
  referencias?: ReferenciaCopiloto[]
  fallback?: boolean
}

const FALLBACK_TEXTO =
  'Ainda não tenho essa análise no protótipo — as respostas deste mockup são pré-computadas a partir do snapshot do dia. Experimente uma das perguntas sugeridas abaixo.'

const normaliza = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[?.!]/g, '')
    .trim()

function buscarResposta(pergunta: string): Pick<ItemChat, 'rica' | 'simples' | 'texto' | 'fallback'> {
  const alvo = normaliza(pergunta)
  const rica = copiloto.respostasRicas.find(
    (r) => normaliza(r.pergunta) === alvo || normaliza(r.pergunta).includes(alvo) || alvo.includes(normaliza(r.pergunta)),
  )
  if (rica) return { rica }
  const simples = copiloto.respostas.find(
    (r) => normaliza(r.pergunta) === alvo || normaliza(r.pergunta).includes(alvo) || alvo.includes(normaliza(r.pergunta)),
  )
  if (simples) return { simples }
  return { texto: FALLBACK_TEXTO, fallback: true }
}

const btnPrimary =
  'rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light'
const btnGhost =
  'rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink'

const blocos = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

function SeloGemini() {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-info text-white" aria-hidden="true">
        <Sparkles size={13} />
      </span>
      <span className="text-[11px] font-semibold text-ink-subtle">Gemini</span>
    </span>
  )
}

function TabelaResposta({ tabela }: { tabela: NonNullable<RespostaRicaCopiloto['tabela']> }) {
  const colunas: DataTableColumn<string[]>[] = tabela.colunas.map((coluna, i) => ({
    key: String(i),
    header: coluna,
    align: i === 0 ? 'left' : 'right',
    render: (linha) => (i === 0 ? <span className="font-medium text-ink">{linha[i]}</span> : linha[i]),
  }))
  return (
    <DataTable
      caption="Tabela da resposta do copiloto"
      columns={colunas}
      rows={tabela.linhas}
      rowKey={(linha) => linha[0]}
      minWidth={460}
      className="shadow-none"
    />
  )
}

function BolhaCopiloto({ item }: { item: ItemChat }) {
  const rica = item.rica
  return (
    <div className="flex items-start gap-2">
      <SeloGemini />
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="min-w-0 max-w-[92%] flex-1 rounded-card-lg rounded-tl-sm border border-edge/70 bg-card p-4 lg:max-w-[85%]"
      >
        {item.texto && (
          <motion.p variants={blocos} className="text-sm leading-relaxed text-ink-muted">
            {item.texto}
          </motion.p>
        )}

        {item.simples && (
          <>
            <motion.p variants={blocos} className="tnums text-sm leading-relaxed text-ink-muted">
              {item.simples.resposta}
            </motion.p>
            {item.simples.referencias && (
              <motion.div variants={blocos} className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">Fontes</span>
                {item.simples.referencias.map((ref) => (
                  <Link key={ref.rotulo} to={ref.rota}>
                    <Pill tone="info">{ref.rotulo}</Pill>
                  </Link>
                ))}
              </motion.div>
            )}
          </>
        )}

        {item.referencias && (
          <motion.div variants={blocos} className="mt-3 flex flex-wrap items-center gap-1.5">
            {item.referencias.map((ref) => (
              <Link key={ref.rotulo} to={ref.rota}>
                <Pill tone="info">{ref.rotulo}</Pill>
              </Link>
            ))}
          </motion.div>
        )}

        {rica && (
          <div className="space-y-3">
            <motion.p variants={blocos} className="tnums text-sm leading-relaxed text-ink-muted">
              {rica.texto}
            </motion.p>
            {rica.tabela && (
              <motion.div variants={blocos}>
                <TabelaResposta tabela={rica.tabela} />
              </motion.div>
            )}
            {rica.bullets && (
              <motion.ul variants={blocos} className="space-y-1.5 pl-4">
                {rica.bullets.map((bullet) => (
                  <li key={bullet} className="tnums list-disc text-xs leading-relaxed text-ink-muted marker:text-gold">
                    {bullet}
                  </li>
                ))}
              </motion.ul>
            )}
            {rica.recomendacao && (
              <motion.div variants={blocos}>
                <RecommendationCard
                  title={rica.recomendacao.titulo}
                  rationale={rica.recomendacao.texto}
                  stats={rica.recomendacao.stats.map((s) => ({ label: s.label, value: s.value, hint: s.hint }))}
                  badges={<Badge kind="confianca" value={snapshot.compra.recomendacao.confiancaPct} />}
                />
              </motion.div>
            )}
            {rica.destaque && (
              <motion.p
                variants={blocos}
                className="tnums rounded-card border border-gold/30 bg-gold/10 px-3 py-2.5 text-xs leading-relaxed text-ink"
              >
                {rica.destaque}
              </motion.p>
            )}
            <motion.div variants={blocos} className="flex flex-wrap items-center gap-1.5 border-t border-edge/60 pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
                Dados usados
              </span>
              {rica.fontes.map((fonte) => (
                <Pill key={fonte} tone="neutral">
                  {fonte}
                </Pill>
              ))}
            </motion.div>
            <motion.div variants={blocos} className="flex flex-wrap items-center gap-2">
              {rica.acoes.map((acao, i) => (
                <Link key={acao.rotulo} to={acao.rota} className={i === 0 ? btnPrimary : btnGhost}>
                  {acao.rotulo}
                </Link>
              ))}
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default function Copilot() {
  const [mensagens, setMensagens] = useState<ItemChat[]>(() =>
    copiloto.conversaInicial.map((m) => ({
      id: m.id,
      autor: m.autor,
      texto: m.texto,
      referencias: m.referencias,
    })),
  )
  const [rascunho, setRascunho] = useState('')
  const [pensando, setPensando] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timerRef.current), [])
  useEffect(() => {
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    fimRef.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'end' })
  }, [mensagens, pensando])

  const enviar = (pergunta: string) => {
    const texto = pergunta.trim()
    if (!texto || pensando) return
    setRascunho('')
    setMensagens((atual) => [...atual, { id: `u-${atual.length}`, autor: 'usuario', texto }])
    setPensando(true)
    timerRef.current = setTimeout(() => {
      setPensando(false)
      setMensagens((atual) => [...atual, { id: `c-${atual.length}`, autor: 'copiloto', ...buscarResposta(texto) }])
    }, 700)
  }

  // Pergunta vinda do command palette (/copiloto?q=…): envia automaticamente
  const location = useLocation()
  const perguntaUrlEnviada = useRef(false)
  useEffect(() => {
    if (perguntaUrlEnviada.current) return
    const q = new URLSearchParams(location.search).get('q')
    if (q) {
      perguntaUrlEnviada.current = true
      enviar(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  return (
    <div className="flex h-[calc(100dvh-10.5rem)] min-h-[540px] flex-col space-y-4">
      <SectionTitle
        eyebrow="Operação"
        title="Copiloto Gemini"
        subtitle="Pergunte em linguagem natural sobre a decisão do dia e os porquês."
        actions={
          <span className="flex items-center gap-2 rounded-full border border-info/40 bg-info/10 px-3 py-1.5">
            <Sparkles size={14} className="text-info" aria-hidden="true" />
            <span className="text-xs font-semibold text-ink">A IA recomenda. O executivo decide.</span>
          </span>
        }
      />

      <ContextoNoticiasAoVivo />

      <Card padding="none" className="flex min-h-0 flex-1 flex-col">
        {/* Histórico */}
        <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 lg:p-5">
          {mensagens.map((item) =>
            item.autor === 'usuario' ? (
              <div key={item.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-card-lg rounded-tr-sm border border-gold/30 bg-gold/15 px-4 py-2.5 text-sm text-ink">
                  {item.texto}
                </p>
              </div>
            ) : (
              <BolhaCopiloto key={item.id} item={item} />
            ),
          )}
          {pensando && (
            <div className="flex items-center gap-2">
              <SeloGemini />
              <span className="flex items-center gap-1 rounded-card-lg rounded-tl-sm border border-edge/70 bg-card px-4 py-3" aria-label="Copiloto digitando">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-subtle" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-subtle [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-subtle [animation-delay:300ms]" />
              </span>
            </div>
          )}
          <div ref={fimRef} />
        </div>

        {/* Chips + input fixo embaixo */}
        <div className="border-t border-edge/60 p-3 lg:p-4">
          <div className="flex flex-wrap gap-1.5">
            {copiloto.chips.map((pergunta) => (
              <button
                key={pergunta}
                type="button"
                onClick={() => enviar(pergunta)}
                className="rounded-full border border-edge bg-card-2 px-3 py-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-gold/40 hover:text-ink"
              >
                {pergunta}
              </button>
            ))}
          </div>
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              enviar(rascunho)
            }}
          >
            <input
              type="text"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              placeholder="Pergunte sobre a decisão do dia…"
              aria-label="Pergunta para o copiloto"
              className="min-w-0 flex-1 rounded-full border border-edge bg-card-2 px-4 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-gold/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!rascunho.trim() || pensando}
              aria-label="Enviar pergunta"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-navy transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendHorizontal size={16} aria-hidden="true" />
            </button>
          </form>
        </div>
      </Card>
    </div>
  )
}

/**
 * Contexto de notícias do agente (só quando a periferia está ao vivo):
 * "li N manchetes nas últimas 24h" — enriquece a narrativa sem tocar
 * nas respostas encenadas (núcleo).
 */
function ContextoNoticiasAoVivo() {
  const noticias = useNoticiasAoVivo()
  if (!noticias.isLive) return null
  const corte = Date.now() - 24 * 60 * 60 * 1000
  const em24h = noticias.value.filter((n) => Date.parse(n.horario) >= corte).length
  const recente = noticias.value[0]
  return (
    <p className="flex items-center gap-2 rounded-card border border-info/30 bg-info/10 px-3 py-2 text-xs text-ink-muted">
      <Newspaper size={13} className="shrink-0 text-info" aria-hidden="true" />
      <span className="min-w-0 truncate">
        <span className="font-semibold text-ink">Contexto ao vivo (GDELT):</span> li {em24h} manchete
        {em24h === 1 ? '' : 's'} de trigo/geopolítica nas últimas 24h
        {recente ? <> — mais recente: “{recente.titulo}”</> : null}
      </span>
    </p>
  )
}
