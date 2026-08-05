/**
 * Modelo de domínio da Wheat & Flour Value Tower — a "verdade única" da demo.
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

  // --- Parâmetros de moagem e economia da conversão (elo trigo → farinha) ---

  /** Rendimento de farinha (%): t de farinha por 100 t de trigo moído. */
  rendimentoPct: number
  /** Taxa de extração (%) do endosperma — define cinzas/cor da farinha. */
  extracaoPct: number
  /** Capacidade de moagem em t de trigo por mês. */
  capacidadeMensalT: number
  /** Utilização da capacidade instalada (%). */
  utilizacaoPct: number
  /** Custo de conversão (R$/t de farinha): moagem, mão de obra, embalagem. */
  custoConversaoRsT: number
  /** Energia e manutenção (R$/t de farinha). */
  energiaManutRsT: number
  /** Perdas de processo e custo financeiro do estoque em processo (R$/t de farinha). */
  perdasFinanceiroRsT: number
  /** Crédito do farelo e subprodutos (R$/t de farinha) — receita que ABATE o custo. */
  creditoFareloRsT: number
  /** Custo marginal de moer +1 t de farinha (R$/t): só a parcela variável de
   * conversão, energia e perdas. NÃO inclui trigo, custos fixos nem depreciação —
   * é o piso de decisão de curto prazo (aceitar ou recusar um pedido spot). */
  custoMarginalRsT: number
  /** Depreciação alocada (R$/t de farinha). */
  depreciacaoRsT: number
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

export type AlavancaVRO = 'mercado-compra' | 'logistica-estoques' | 'qualidade-blend' | 'integracao' | 'hedge'

/** Uma recomendação do hub: o que a IA sugeriu, o que o humano decidiu, o que o resultado mediu. */
export interface RecomendacaoVRO {
  id: string
  data: string
  titulo: string
  alavanca: AlavancaVRO
  recomendacaoIA: string
  decisaoHumana: 'aprovada' | 'ajustada' | 'rejeitada' | 'pendente'
  decisaoNota?: string
  resultado: string
  /** Valor capturado no CPV (R$; já com haircut de 15–20%). Negativo = miss. */
  valorCpvRs: number
  /** Valor protegido por hedge (R$). */
  valorHedgeRs: number
  status: 'realizado' | 'projetado'
  confiancaPct: number
}

export interface PontoCurvaVRO {
  mes: string
  acumuladoRs: number
  metaRs: number
  /** Presente apenas no mês corrente: acumulado + recomendação do dia. */
  projetadoRs?: number
}

export interface MetricasVRO {
  cpvCapturadoYtdRs: number
  hedgeProtegidoYtdRs: number
  ebitdaIncrementalYtdRs: number
  ebitdaIncrementalPp: number
  runRateAnualRs: number
  acuraciaModeloPct: number
  hitRatePct: number
  driftPct: number
  /** Erro médio mensal do modelo (%), mar→ago. */
  erroSerie: number[]
  /** Postura das decisões executadas por perfil (%). */
  posturaDecisoesPct: { conservador: number; recomendado: number; oportunistico: number }
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

/** Clima encenado (estruturalmente compatível com o Clima do provider Open-Meteo). */
export interface ClimaSnapshot {
  temperaturaC: number
  precipitacaoMm: number
  /** WMO weather code (0 = céu limpo). */
  codigoTempo: number
  chuva7dMm: number | null
  horario: string
}

/** Manchete encenada — fallback do ticker de notícias (GDELT). */
export interface NoticiaCenario {
  titulo: string
  fonte: string
  horario: string
}

/** Clima encenado por região de trigo — fallback do painel Clima & Safra. */
export interface ClimaRegiaoCenario {
  regiaoId: string
  resumo: string
  nivel: 'baixo' | 'medio' | 'alto'
  chuva7dMm: number
  tMaxC: number
}

// --- Proveniência e qualidade de dados (governança) ---

/** Famílias de dado com proveniência registrada no Hub. */
export type FamiliaDado = 'preco' | 'cambio' | 'frete' | 'safra' | 'estoque' | 'qualidade' | 'alertas'

export type ConfiabilidadeFonte = 'alta' | 'media' | 'baixa'

/** Como a família é atualizada: feed contínuo, carga diária ou por contrato/evento. */
export type MetodoFonte = 'tempo-real' | 'diario' | 'contrato' | 'mensal'

export interface FonteDado {
  familia: FamiliaDado
  /** Rótulo da família (ex.: "Preço do trigo"). */
  rotulo: string
  /** Fonte completa (ex.: "CBOT (CME) · Kansas City HRW"). */
  fonte: string
  /** Nome curto para o selo (ex.: "CBOT"). */
  fonteCurta: string
  metodo: MetodoFonte
  confiabilidade: ConfiabilidadeFonte
  /** Última carga (ISO, âncora terça 12 ago). Famílias tempo-real correm com o tick global. */
  atualizadoEm: string
  /** Rótulo humano do frescor para métodos não tempo-real (ex.: "hoje 06:30"). */
  frescorRotulo: string
  responsavel: string
  /** Regras de validação aplicadas antes de o dado entrar no Hub. */
  validacoes: readonly string[]
}

export type StatusRegraDado = 'ok' | 'aviso' | 'falha'

export interface RegraQualidadeDado {
  id: string
  familia: FamiliaDado
  regra: string
  status: StatusRegraDado
  detalhe: string
  responsavel: string
}

export interface ResumoQualidadeDados {
  regrasAtivas: number
  avisosAbertos: number
  falhasAbertas: number
  /** Fontes com dono nomeado (%): governança completa = 100. */
  fontesComDonoPct: number
}

// ---------------------------------------------------------------------------
// Elo 2 — Farinha: especificação, moagem e custo interno
// ---------------------------------------------------------------------------

export type AplicacaoFarinha =
  | 'massa'
  | 'biscoito'
  | 'pao'
  | 'bolo'
  | 'pizza'
  | 'domestica'
  | 'industrial'

export type FarinhaId = 'massa' | 'biscoito' | 'cracker' | 'pao' | 'bolo' | 'domestica'

/**
 * Especificação técnica da farinha — a unidade de comparação apples-to-apples.
 * Duas farinhas só podem ter preços comparados quando a spec, a aplicação e a
 * apresentação coincidem (ver CLAUDE.md § Comparação apples-to-apples).
 */
export interface FarinhaSpec {
  id: FarinhaId
  nome: string
  /** Proteína em % (base 14% de umidade). */
  proteina: number
  /** Força de glúten — W do alveógrafo. */
  gluten: number
  /** Cinzas em % (base seca) — proxy do tipo/extração. */
  cinzas: number
  /** Umidade em %. */
  umidade: number
  /** Falling number em segundos (atividade amilásica). */
  fallingNumber: number
  /** Cor Kent-Jones: quanto MENOR, mais branca a farinha. */
  cor: number
  /** Granulometria: % passante em peneira de 132 µm. */
  granulometria: number
  aplicacao: AplicacaoFarinha
  /** Prêmio (ou desconto) do blend desta spec sobre o blend da farinha de
   * massas, em R$/t de TRIGO. É um DELTA: o custo absoluto do trigo sai do
   * motor de TLC para cada moinho e só então recebe este prêmio. Farinhas soft
   * usam blends mais baratos (delta negativo); farinhas hard, mais HRW. */
  premioBlendRsT: number
  /** Ajuste de rendimento sobre o do moinho (pontos percentuais): farinhas mais
   * refinadas (cinzas baixas) extraem menos; farinhas rústicas extraem mais. */
  ajusteRendimentoPp: number
  /** Blend de trigo de referência, em texto (rastreia até a tela de Compra). */
  blendReferencia: string
}

export type TipoComponenteCustoFarinha =
  | 'trigo'
  | 'conversao'
  | 'energia'
  | 'logistica'
  | 'perdas'
  | 'depreciacao'
  | 'credito'

export interface ComponenteCustoFarinha {
  rotulo: string
  /** Rótulo compacto para eixo de waterfall. */
  rotuloCurto?: string
  /** R$ por tonelada de FARINHA. Negativo = crédito (farelo/subprodutos). */
  valorRs: number
  tipo: TipoComponenteCustoFarinha
  descricao?: string
}

/** Composição do custo interno da farinha por moinho × farinha (a tabela). */
export interface CustoInternoFarinha {
  moinhoId: MoinhoId
  farinhaId: FarinhaId
  /** TLC do trigo posto no moinho (R$/t de TRIGO) — vem do elo 1. */
  tlcTrigoRsT: number
  /** Rendimento aplicado (%) = rendimento do moinho + ajuste da farinha. */
  rendimentoPct: number
  /** t de trigo consumidas por t de farinha = 1 / rendimento. */
  fatorTrigoPorFarinha: number
  /** t de farelo geradas por t de farinha = (1 / rendimento) − 1. */
  fatorFareloPorFarinha: number
  componentes: ComponenteCustoFarinha[]
  /** Custo interno da farinha (R$/t de farinha) — soma dos componentes.
   * É o custo PLENO ABSORVIDO: a visão de P&L, com depreciação. */
  totalRsT: number
  /** Custo EVITÁVEL (R$/t) = total − depreciação. É a base correta da decisão
   * Make/Buy: a depreciação é afundada e não desaparece ao comprar de fora. */
  custoEvitavelRsT: number
  /** Piso de curto prazo (R$/t): trigo + variáveis − crédito, sem fixos. */
  custoMarginalRsT: number
}

// ---------------------------------------------------------------------------
// Mercado de farinha — preço externo comparável
// ---------------------------------------------------------------------------

export type RegiaoComercial = 'nordeste' | 'norte' | 'sudeste' | 'sul' | 'centro-oeste'

export type CanalFarinha = 'industrial' | 'panificacao' | 'distribuidor' | 'varejo'

export type ApresentacaoFarinha = 'granel' | 'big-bag' | 'saco-25kg' | 'saco-1kg'

/** Base logística do preço cotado — muda o que está incluso. */
export type BasePrecoFarinha = 'posto-fabrica' | 'posto-cliente'

/**
 * Preço de farinha de terceiros por região × spec × canal × apresentação.
 * `comparavel` marca as cotações que podem ser confrontadas diretamente com o
 * custo interno da MESMA spec; as demais exigem os ajustes de `ressalva`.
 */
export interface PrecoFarinhaExterno {
  id: string
  regiao: RegiaoComercial
  farinhaId: FarinhaId
  canal: CanalFarinha
  apresentacao: ApresentacaoFarinha
  /** Preço de mercado em R$/t de farinha. */
  precoRsT: number
  base: BasePrecoFarinha
  /** Prazo da condição comercial (dias). */
  prazoDias: number
  /** Volume mínimo da cotação (t/mês). */
  volumeMinimoT: number
  fonte: string
  /** true = apples-to-apples com o custo interno da mesma farinha. */
  comparavel: boolean
  /** Ajustes necessários antes de comparar (obrigatório quando comparavel=false). */
  ressalva?: string
}

// ---------------------------------------------------------------------------
// Elo 3 — Demanda: plano de vendas → farinha → trigo
// ---------------------------------------------------------------------------

export type FamiliaProduto = 'massas' | 'biscoitos' | 'bolos' | 'torradas'

export interface PontoCalendarioDemanda {
  /** Mês de referência (ISO 'YYYY-MM'). */
  mes: string
  /** Necessidade de farinha no mês (t). */
  farinhaT: number
  /** Necessidade de trigo equivalente no mês (t). */
  trigoT: number
}

/**
 * Da venda do produto acabado à tonelada de trigo: a ponte que faz o
 * planejamento de demanda e a compra de trigo falarem a mesma língua.
 */
export interface DemandaFarinha {
  familia: FamiliaProduto
  rotulo: string
  farinhaId: FarinhaId
  /** Plano de vendas do produto acabado (t/mês). */
  planoVendasT: number
  /** t de farinha por t de produto acabado (receita média da família). */
  fatorFarinha: number
  /** Necessidade de farinha (t/mês) = planoVendas × fatorFarinha. */
  necessidadeFarinhaT: number
  /** Necessidade de trigo (t/mês) = necessidadeFarinha / rendimento. */
  necessidadeTrigoT: number
  /** Política de estoque de segurança (dias de cobertura). */
  estoqueSegurancaDias: number
  estoqueSegurancaT: number
  /** Moinhos que abastecem a família. */
  moinhosAtendem: MoinhoId[]
  calendario: PontoCalendarioDemanda[]
}

// ---------------------------------------------------------------------------
// Elo 4 — Comercial: clientes externos e oportunidades de venda
// ---------------------------------------------------------------------------

export interface ClienteExterno {
  id: string
  nome: string
  regiao: RegiaoComercial
  canal: CanalFarinha
  /** Rating de crédito do cliente. */
  rating: 'A' | 'B' | 'C'
  volumeMensalT: number
  prazoDias: number
  relacionamentoAnos: number
}

export type StatusOportunidade = 'recomendada' | 'avaliar' | 'recusar'

export interface OportunidadeComercial {
  id: string
  clienteId: string
  farinhaId: FarinhaId
  /** Moinho que atenderia — define o custo interno da conta. */
  moinhoId: MoinhoId
  regiao: RegiaoComercial
  canal: CanalFarinha
  apresentacao: ApresentacaoFarinha
  volumeT: number
  /** Preço líquido de venda (R$/t): já sem impostos, descontos e devoluções. */
  precoLiquidoRsT: number
  /** Custo de servir (R$/t): frete ao cliente, comissão, embalagem e risco de crédito. */
  custoServirRsT: number
  /** Custo interno da farinha no moinho que atende (R$/t). */
  custoInternoRsT: number
  /** Margem (R$/t) = precoLíquido − custoInterno − custoDeServir. */
  margemRsT: number
  margemTotalRs: number
  /** Preço mínimo (R$/t) que ainda cobre custo interno + custo de servir. */
  precoMinimoRsT: number
  /** Capacidade ociosa do moinho na janela (t/mês). */
  capacidadeDisponivelT: number
  status: StatusOportunidade
  racional: string
}

// ---------------------------------------------------------------------------
// Elo 5 — Make/Buy/Sell: a decisão consolidada
// ---------------------------------------------------------------------------

export type AlternativaMbs =
  | 'produzir-consumir'
  | 'comprar'
  | 'produzir-vender'
  | 'estoque'
  | 'parar-moagem'

/** A que tonelagem a alternativa se aplica: a demanda interna ou a folga. */
export type EscopoAlternativaMbs = 'demanda' | 'capacidade-ociosa'

export interface ResultadoAlternativaMbs {
  alternativa: AlternativaMbs
  rotulo: string
  /** Resultado econômico em R$/t de farinha, medido CONTRA a referência de
   * comprar farinha no mercado (alternativa 'comprar' = 0 por definição).
   * Base: custo PLENO, coerente com o KPI de ganho da verticalização. */
  resultadoRsT: number
  /** O mesmo resultado na base do custo EVITÁVEL (sem depreciação afundada) —
   * a leitura de curto prazo. Divergir de `resultadoRsT` em sinal é o alerta
   * de que a decisão muda conforme a base de custo escolhida. */
  resultadoEvitavelRsT: number
  /** Tonelagem a que ESTA alternativa se aplica (t de farinha/mês). */
  volumeAplicavelT: number
  /** Resultado no volume aplicável (R$). */
  resultadoRs: number
  /** Se disputa a demanda interna ou a capacidade ociosa. */
  escopo: EscopoAlternativaMbs
  /** false quando a alternativa esbarra em capacidade, spec ou política. */
  viavel: boolean
  nota: string
}

/**
 * A decisão Make/Buy/Sell de um moinho × farinha, com as 5 alternativas.
 *
 * São DUAS decisões sobre tonelagens diferentes, e por isso há duas
 * recomendações: o que fazer com a demanda das fábricas (produzir, comprar,
 * estocar ou parar) e o que fazer com a capacidade que sobra (vender ou
 * deixar ociosa). Misturar as duas é o que faria "vender" parecer melhor que
 * "produzir" sem notar que a demanda continuaria descoberta.
 */
export interface CenarioMakeBuySell {
  id: string
  moinhoId: MoinhoId
  farinhaId: FarinhaId
  /** Demanda interna em decisão (t de farinha/mês). */
  volumeT: number
  /** Custo pleno absorvido (R$/t) — visão de P&L. */
  custoInternoRsT: number
  /** Custo evitável (R$/t), sem depreciação — base da decisão Make/Buy. */
  custoEvitavelRsT: number
  /** Preço equivalente de compra externa da MESMA spec (R$/t). */
  precoExternoRsT: number
  /** Preço líquido de venda a terceiros (R$/t). */
  precoVendaLiquidoRsT: number
  custoServirRsT: number
  /** Capacidade ociosa do moinho na janela (t de farinha/mês). */
  capacidadeDisponivelT: number
  alternativas: ResultadoAlternativaMbs[]
  /** Melhor destino da DEMANDA interna. */
  recomendada: AlternativaMbs
  /** Melhor destino da CAPACIDADE OCIOSA (null = nada a alocar). */
  recomendadaCapacidadeOciosa: AlternativaMbs | null
  /** Resultado das duas recomendações somadas (R$). */
  resultadoRs: number
  /** Valor da DECISÃO (R$): quanto a recomendada rende a mais que a segunda
   * melhor alternativa. É o número honesto quando 'comprar' vence — evitar
   * uma perda vale tanto quanto capturar um ganho. */
  beneficioVsAlternativaRs: number
  racional: string
}

// ---------------------------------------------------------------------------
// KPIs executivos da cadeia trigo → farinha → margem
// ---------------------------------------------------------------------------

/** Semáforo de eficiência do moinho contra a capacidade econômica mínima. */
export type SemaforoMoinho = 'verde' | 'ambar' | 'vermelho'

/**
 * Retrato de eficiência de um moinho na spec de referência — a linha da
 * tabela da tela Performance dos Moinhos. Tudo derivado do motor econômico.
 */
export interface EficienciaMoinho {
  moinhoId: MoinhoId
  farinhaId: FarinhaId
  /**
   * O moinho realmente roda esta spec (a aplicação está no seu perfilProduto).
   * Quando false, o custo é uma SIMULAÇÃO comparativa: útil para pôr todas as
   * unidades na mesma régua, mas não se pode coroar de "menor custo" quem não
   * produz o item — seria eleger um campeão numa prova que ele não disputa.
   */
  rodaSpec: boolean
  rendimentoPct: number
  extracaoPct: number
  utilizacaoPct: number
  /** Custo pleno absorvido (R$/t de farinha). */
  custoInternoRsT: number
  /** Custo evitável (R$/t) — sem a depreciação afundada. */
  custoEvitavelRsT: number
  /** Custo de produzir +1 t (R$/t) — o piso do "produzir para vender". */
  custoMarginalRsT: number
  /**
   * Margem da tonelada INCREMENTAL vendida a terceiros (R$/t) =
   * preço externo comparável − custo de servir − custo marginal. É a conta que
   * decide aceitar um pedido spot com o moinho ocioso; comparar o preço direto
   * com o custo marginal, sem o custo de servir, superestima e inverte sinal.
   */
  margemIncrementalRsT: number
  /** Crédito do farelo no rendimento efetivo da spec (R$/t de farinha). */
  creditoFareloRsT: number
  /** Custo do trigo posto no moinho (R$/t de TRIGO) — vem do motor de TLC. */
  tlcTrigoRsT: number
  /** Custo fixo absorvido por tonelada na utilização atual (R$/t). */
  custoFixoRsT: number
  capacidadeFarinhaT: number
  capacidadeOciosaT: number
  /** Preço externo comparável da mesma spec na região do moinho (R$/t). */
  precoExternoRsT: number
  /** Ganho de verticalizar nesta unidade (R$/t) = preço externo − custo pleno. */
  ganhoRsT: number
  /**
   * CAPACIDADE ECONÔMICA MÍNIMA: utilização (%) abaixo da qual a diluição dos
   * custos fixos leva o custo pleno a ultrapassar o preço de mercado. null
   * quando nenhuma utilização torna a unidade competitiva (nem a 100%).
   */
  utilizacaoMinimaPct: number | null
  /** Folga em pontos percentuais entre a utilização atual e a mínima. */
  folgaPp: number | null
  semaforo: SemaforoMoinho
  /** Explicação curta do semáforo, para o WhyPopover. */
  diagnostico: string
}

/** Os 10 KPIs do elo farinha — todos derivados, nenhum digitado à mão. */
export interface KpiFarinha {
  /** 1. Custo do trigo posto no moinho (R$/t de trigo) — o TLC do elo 1. */
  custoTrigoPostoRsT: number
  /** 2. Custo da farinha produzida (R$/t de farinha). */
  custoFarinhaRsT: number
  /** 3. Preço equivalente de compra externa, mesma spec (R$/t de farinha). */
  precoExternoEquivalenteRsT: number
  /** 4. Ganho da verticalização (R$/t de farinha) = 3 − 2. */
  ganhoVerticalizacaoRsT: number
  /** 5. Margem de venda externa (R$/t de farinha). */
  margemVendaExternaRsT: number
  /** 6. Rendimento de farinha (%). */
  rendimentoPct: number
  /** 7. Crédito do farelo (R$/t de farinha). */
  creditoFareloRsT: number
  /** 8. Utilização da capacidade instalada (%). */
  utilizacaoCapacidadePct: number
  /** 9. Gap interno vs mercado (%): quanto o custo interno está ABAIXO do preço externo. */
  gapInternoMercadoPct: number
  /** 10. Benefício Make/Buy/Sell consolidado (R$/mês). */
  beneficioMakeBuySellRs: number
}
