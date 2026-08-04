/**
 * Modelo de domínio do Hub de Trigo — a "verdade única" da demo.
 * Todos os componentes de tela consomem estes tipos via src/data.
 */

// ---------------------------------------------------------------------------
// Identificadores de domínio
// ---------------------------------------------------------------------------

export type OrigemId = 'argentina' | 'eua-golfo' | 'canada' | 'russia' | 'uruguai' | 'brasil'

export type PortoId = 'pecem' | 'mucuripe' | 'suape' | 'aratu' | 'cabedelo' | 'natal'

export type MoinhoId =
  | 'fortaleza'
  | 'eusebio'
  | 'natal'
  | 'salvador'
  | 'cabedelo'
  | 'rolandia'
  | 'bento-goncalves'

// ---------------------------------------------------------------------------
// Entidades de domínio
// ---------------------------------------------------------------------------

export interface Origem {
  id: OrigemId
  nome: string
  pais: string
  mercosul: boolean
  /** Classe predominante do trigo exportado (soft/hard, W típico). */
  classeTrigo: string
  faixaW: [number, number]
  faixaProteina: [number, number]
  /** Trânsito marítimo médio até o Nordeste, em dias (0 = doméstico). */
  transitoDias: number
}

export interface Fornecedor {
  id: string
  nome: string
  origemId: OrigemId
  rating: 'A' | 'B' | 'C'
  volumeAnualKt: number
}

export interface Porto {
  id: PortoId
  nome: string
  uf: string
  filaNavios: number
  custoPortuarioRsT: number
  capacidadeMensalKt: number
  coordenadas?: { lat: number; lon: number }
}

export interface Moinho {
  id: MoinhoId
  nome: string
  cidade: string
  uf: string
  capacidadeAnualKt: number
  portoPreferencialId: PortoId
  perfilProduto: Array<'biscoito' | 'cracker' | 'massa' | 'pao'>
  coordenadas?: { lat: number; lon: number }
}

export interface Contrato {
  id: string
  fornecedorId: string
  origemId: OrigemId
  portoDestinoId: PortoId
  volumeToneladas: number
  precoUsdT: number
  incoterm: 'FOB' | 'CFR' | 'CIF'
  status: 'planejado' | 'ativo' | 'executado'
  janelaEmbarque: { inicio: string; fim: string }
}

export interface Embarque {
  id: string
  contratoId: string
  navio: string
  origemId: OrigemId
  portoDestinoId: PortoId
  /** Moinho prioritário atendido pela descarga, quando aplicável. */
  moinhoDestinoId?: MoinhoId
  volumeToneladas: number
  etaOriginal: string
  etaAtual: string
  atrasoDias: number
  status: 'programado' | 'em-transito' | 'atrasado' | 'atracado' | 'descarregado'
  riscoDemurrageRs?: number
}

export interface ParametrosQualidade {
  /** Proteína em % (base 13,5% umidade). */
  proteina: number
  /** Força de glúten (W, alveógrafo). */
  w: number
  /** Falling number em segundos. */
  fallingNumber: number
  /** Relação tenacidade/extensibilidade. */
  pl: number
  /** Peso hectolítrico em kg/hl. */
  pesoHectolitrico: number
  /** Umidade em %. */
  umidade: number
  /** Cinzas em %. */
  cinzas: number
  /** Deoxinivalenol em ppb. */
  don: number
}

// ---------------------------------------------------------------------------
// Mercado e previsão
// ---------------------------------------------------------------------------

export interface SinalMercado {
  id: string
  categoria: 'mercado' | 'clima' | 'logistica' | 'interno'
  impacto: 'alta' | 'baixa' | 'neutro'
  titulo: string
  descricao: string
  fonte?: string
  timestamp: string
}

export interface PontoPrevisao {
  data: string
  valor: number
  bandaMin?: number
  bandaMax?: number
}

export interface FatorPrevisao {
  rotulo: string
  /** Peso relativo do fator na projeção (0–1). */
  peso: number
  direcao: 'alta' | 'baixa' | 'neutra'
  descricao?: string
}

/** Curva projetada de FOB por origem: CBOT + prêmio de origem interpolado. */
export interface PrevisaoOrigem {
  origemId: OrigemId
  rotulo: string
  premioAtualUsdT: number
  premioD90UsdT: number
  projecao: PontoPrevisao[]
}

export interface SeriePrevisao {
  id: string
  nome: string
  unidade: string
  valorAtual: number
  variacao30dPct: number
  historico: PontoPrevisao[]
  projecao: PontoPrevisao[]
  horizontes: {
    d7: PontoPrevisao
    d30: PontoPrevisao
    d60: PontoPrevisao
    d90: PontoPrevisao
  }
  fatores: FatorPrevisao[]
}

// ---------------------------------------------------------------------------
// TLC e compra
// ---------------------------------------------------------------------------

export interface ComponenteTLC {
  rotulo: string
  /** Rótulo compacto para o eixo do waterfall. */
  rotuloCurto?: string
  valorRs: number
  tipo:
    | 'fob'
    | 'premio'
    | 'cambio'
    | 'frete'
    | 'seguro'
    | 'taxa'
    | 'imposto'
    | 'porto'
    | 'risco'
    | 'armazenagem'
    | 'transporte'
    | 'capital'
  descricao?: string
}

export type Incoterm = 'FOB' | 'CFR' | 'CIF'

/** Seleção dos filtros da tela de TLC. */
export interface SelecaoTlc {
  origemId: OrigemId
  portoId: PortoId
  moinhoId: MoinhoId
  incoterm: Incoterm
}

/** Parcela de risco precificada DENTRO do TLC (não é custo adicional). */
export interface RiscoTlc {
  demurrageRs: number
  qualidadeRs: number
  atrasoRs: number
  totalRs: number
  pctDoTlc: number
}

export interface ResultadoTlc {
  selecao: SelecaoTlc
  componentes: ComponenteTLC[]
  totalRs: number
  deltaVsBaselineRs: number
  risco: RiscoTlc
}

export interface AlternativaCompra {
  id: string
  origemId: OrigemId
  /** Ausente para compra doméstica (modal rodoviário). */
  portoId?: PortoId
  fornecedorId: string
  /** FOB em US$/t — ausente para compra doméstica em R$. */
  fobUsd?: number
  freteUsd?: number
  /** Alíquota de importação (0% Mercosul / 10% extra-Mercosul). */
  impostoPct: number
  tlcRs: number
  deltaVsBaselineRs: number
  qualidade: ParametrosQualidade
  atendeEspec: boolean
  volumeDisponivelToneladas: number
  recomendada?: boolean
  observacao?: string
}

export interface ParcelaBlend {
  origemId: OrigemId
  pct: number
}

export interface DistribuicaoMoinho {
  moinhoId: MoinhoId
  toneladas: number
  coberturaAtualDias: number
  coberturaAposDias: number
}

export interface AlternativaRejeitada {
  origemId: OrigemId
  motivo: string
}

export interface EstoqueMoinho {
  moinhoId: MoinhoId
  estoqueToneladas: number
  coberturaDias: number
  politicaMinimaDias: number
}

export interface RecomendacaoCompra {
  id: string
  criadaEm: string
  acao: 'comprar' | 'aguardar'
  origemId: OrigemId
  portoId: PortoId
  fornecedorId: string
  volumeToneladas: number
  janelaDias: number
  blend: ParcelaBlend[]
  tlcRs: number
  baselineRs: number
  economiaRsT: number
  economiaTotalRs: number
  probAlta15dPct: number
  confiancaPct: number
  anteciparPctTrimestre: number
  volumeTrimestreToneladas: number
  racional: string
  distribuicaoMoinhos: DistribuicaoMoinho[]
  alternativasRejeitadas: AlternativaRejeitada[]
}

// ---------------------------------------------------------------------------
// Hedge
// ---------------------------------------------------------------------------

export interface PosicaoHedge {
  bucketPrazo: '0-30' | '31-60' | '61-90' | '91-180'
  expostoUsd: number
  cobertoPct: number
  instrumento?: string
}

export interface RecomendacaoHedge {
  id: string
  criadaEm: string
  horizonteDias: number
  exposicaoUsd: number
  coberturaAtualPct: number
  coberturaAlvoPct: number
  notionalNovoUsd: number
  instrumento: string
  taxaForwardMedia: number
  cenarioCambioD90: number
  protecaoEstimadaRs: number
  varAntesRs: number
  varDepoisRs: number
  racional: string
}

// ---------------------------------------------------------------------------
// Simulador
// ---------------------------------------------------------------------------

export type PerfilSimulacao = 'conservador' | 'recomendado' | 'oportunistico'

export interface SimuladorInputs {
  variacaoPrecoTrigoPct: number
  variacaoCambioPct: number
  atrasoLogisticoDias: number
  /** Frete marítimo na janela (US$/t) — default: frete base do snapshot. */
  freteUsdT?: number
  /** Quebra de safra adicional (%) — amplifica o choque de preço. */
  quebraSafraPct?: number
  /** Variação do consumo dos moinhos (%) — escala o volume do trimestre. */
  consumoPct?: number
  /** Origens indisponíveis (restrição comercial/sanitária). */
  origensRestritas?: OrigemId[]
}

export interface SimuladorOutputs {
  custoTrimestreRs: number
  deltaVsBaselineRs: number
  impactoCpvRs: number
  impactoMargemEbitdaPp: number
  exposicaoResidualUsd: number
  demurrageEstimadoRs: number
  volumeAntecipadoT: number
  volumeRestanteT: number
  /** Origem usada na antecipação (cadeia de fallback quando há restrição). */
  origemAntecipadaId: OrigemId | null
  tlcTravadoRs: number
  hedgePct: number
  janelaDias: number
  /** Intervalo de confiança do delta vs baseline (P10–P90). */
  intervaloConfiancaRs: [number, number]
  nivelRisco: 'baixo' | 'medio' | 'alto'
}

export interface CenarioSimulador {
  inputs: SimuladorInputs
  volumeTrimestreT: number
  porPerfil: Record<PerfilSimulacao, SimuladorOutputs>
}

// ---------------------------------------------------------------------------
// Alertas e copiloto
// ---------------------------------------------------------------------------

export interface Alerta {
  id: string
  severidade: 'critico' | 'alto' | 'medio' | 'info'
  categoria: 'mercado' | 'cambio' | 'logistica' | 'estoque' | 'hedge' | 'qualidade'
  timestamp: string
  titulo: string
  descricao: string
  /** Rota da tela onde a ação sugerida acontece. */
  acaoRota: string
  acaoRotulo: string
}

export interface ReferenciaCopiloto {
  rotulo: string
  rota: string
}

export interface MensagemCopiloto {
  id: string
  autor: 'usuario' | 'copiloto'
  timestamp: string
  texto: string
  referencias?: ReferenciaCopiloto[]
}

export interface PerguntaResposta {
  id: string
  pergunta: string
  resposta: string
  referencias?: ReferenciaCopiloto[]
}

export interface TabelaCopiloto {
  colunas: string[]
  linhas: string[][]
}

export interface MiniRecomendacaoCopiloto {
  titulo: string
  texto: string
  stats: Array<{ label: string; value: string; hint?: string }>
}

/** Resposta estruturada do copiloto: texto + bullets + mini-tabela + card. */
export interface RespostaRicaCopiloto {
  id: string
  pergunta: string
  texto: string
  bullets?: string[]
  tabela?: TabelaCopiloto
  recomendacao?: MiniRecomendacaoCopiloto
  destaque?: string
  /** Chips de "dados usados / fontes". */
  fontes: string[]
  acoes: ReferenciaCopiloto[]
}

// ---------------------------------------------------------------------------
// KPIs e valor capturado
// ---------------------------------------------------------------------------

export interface KpiExposicao {
  exposicaoCambial90dUsd: number
  cambioAtual: number
  protegidoPct: number
  protegidoAlvoPct: number
  coberturaMediaDias: number
  ebitdaYtdRs: number
  margemEbitdaPct: number
}

/** Registro de Valor Realizado/Otimizado — trilha de valor capturado pelas decisões do hub. */
export interface RegistroVRO {
  id: string
  data: string
  categoria: 'compra' | 'hedge' | 'logistica' | 'blend'
  decisao: string
  valorCapturadoRs: number
  status: 'realizado' | 'projetado'
}

export interface RecomendacaoDoDia {
  resumo: string
  probAlta15dPct: number
  impactoProtegidoRs: number
  memoriaCalculo: {
    compraAntecipadaRs: number
    hedgeCambialRs: number
  }
  compra: RecomendacaoCompra
  hedge: RecomendacaoHedge
}
