import { Scale } from 'lucide-react'
import { Card, EmptyState, SectionTitle } from '../components/ui'

/** Placeholder — elo MARGEM: as 5 alternativas de destino da farinha. */
const PERGUNTAS = [
  'Para cada moinho × farinha, qual das 5 alternativas rende mais: produzir e consumir nas fábricas, comprar de terceiros, produzir e vender, estocar ou parar a moagem?',
  'Em que ponto o custo do trigo posto no moinho derruba a vantagem de verticalizar e comprar farinha pronta passa a ser a resposta?',
  'Quanto da capacidade ociosa vale mais como venda externa do que como estoque — e a que preço mínimo?',
]

export default function MakeBuySell() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Margem & Decisão"
        title="Simulador Make/Buy/Sell"
        subtitle="A decisão de alocação da cadeia: produzir, comprar ou vender farinha — as cinco alternativas comparadas contra a mesma referência de mercado."
      />

      <EmptyState
        icon={Scale}
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
