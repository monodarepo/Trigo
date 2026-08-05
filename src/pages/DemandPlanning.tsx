import { CalendarRange } from 'lucide-react'
import { Card, EmptyState, SectionTitle } from '../components/ui'

/** Placeholder — elo MOINHOS: a demanda que puxa a moagem e, por trás dela, a compra. */
const PERGUNTAS = [
  'Quanta farinha cada moinho precisa entregar nas próximas semanas, por família de produto?',
  'Como a sazonalidade e o plano comercial mudam a necessidade de trigo por origem e qualidade?',
  'Qual o erro de previsão que está gerando estoque parado ou ruptura de linha?',
]

export default function DemandPlanning() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Moinhos & Farinha"
        title="Planejamento da Demanda"
        subtitle="A demanda que puxa a cadeia para trás: previsão de farinha e de produto acabado traduzida em necessidade de moagem e, daí, em necessidade de trigo."
      />

      <EmptyState
        icon={CalendarRange}
        tone="gold"
        title="Em construção"
        description="Esta tela entra na próxima rodada, ligada à mesma verdade das demais — sem números provisórios até lá."
      />

      <Card>
        <p className="eyebrow">O que esta tela vai responder</p>
        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
          {PERGUNTAS.map((pergunta) => (
            <li key={pergunta} className="flex gap-2.5">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gold" aria-hidden="true" />
              <span>{pergunta}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
