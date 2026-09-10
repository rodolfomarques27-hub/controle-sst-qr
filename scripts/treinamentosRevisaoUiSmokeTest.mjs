import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSource = readFileSync(
    new URL("./src/components/treinamentos/TreinamentosPage.jsx", `file://${process.cwd()}/`),
    "utf8"
);

const baseSource = readFileSync(
    new URL("./src/components/treinamentos/BaseCertificadosTreinamentos.jsx", `file://${process.cwd()}/`),
    "utf8"
);

const panelSource = readFileSync(
    new URL("./src/components/treinamentos/RevisaoTreinamentosPainel.jsx", `file://${process.cwd()}/`),
    "utf8"
);

const historySource = readFileSync(
    new URL("./src/components/treinamentos/HistoricoRevisoesTreinamentosDrawer.jsx", `file://${process.cwd()}/`),
    "utf8"
);

const serviceSource = readFileSync(
    new URL("./src/services/treinamentosRevisaoService.js", `file://${process.cwd()}/`),
    "utf8"
);

assert.match(
    pageSource,
    /const podeVisualizarTreinamentosSistema = useMemo\([\s\S]*MODULOS_PERMISSAO_SISTEMA\.TREINAMENTOS[\s\S]*ACOES_PERMISSAO_SISTEMA\.VISUALIZAR/,
    "A prévia read-only deve continuar derivando TREINAMENTOS.VISUALIZAR."
);
assert.match(
    pageSource,
    /const podeEditarTreinamentosSistema = useMemo\([\s\S]*ACOES_PERMISSAO_SISTEMA\.EDITAR/,
    "A permissão de edição deve continuar preservada para ações de escrita existentes/futuras."
);
console.log("I3_P1_F4_VIEW_PERMISSION_PRESERVED=OK");
console.log("I3_P1_F4_EDIT_PERMISSION_PRESERVED=OK");

assert.match(
    pageSource,
    /import\s+\{\s*RevisaoTreinamentosPainel\s*\}\s+from\s+"\.\/RevisaoTreinamentosPainel";/,
    "TreinamentosPage deve importar o painel diretamente."
);
assert.doesNotMatch(
    baseSource,
    /React\.lazy|React\.Suspense|import\("\.\/RevisaoTreinamentosPainel"\)|<RevisaoTreinamentosPainel/,
    "A Base não pode continuar responsável por lazy-load ou montagem do painel."
);
console.log("I3_P1_F4_PANEL_DIRECT_IMPORT=OK");
console.log("I3_P1_F4_BASE_NO_LAZY_MODAL=OK");

assert.match(
    pageSource,
    /const\s+\[colaboradorRevisao,\s*setColaboradorRevisao\]\s*=\s*useState\(null\)/,
    "O estado do colaborador em revisão deve pertencer a TreinamentosPage."
);
assert.match(
    pageSource,
    /onRevisarTreinamentos=\{setColaboradorRevisao\}/,
    "TreinamentosPage deve receber o colaborador clicado por callback explícito da Base."
);
assert.match(
    baseSource,
    /onRevisarTreinamentos/,
    "A Base deve receber callback de abertura do painel."
);
assert.match(
    baseSource,
    /onRevisarTreinamentos\?\.\(colaborador\)/,
    "O clique deve encaminhar exatamente o colaborador do card para TreinamentosPage."
);
assert.match(
    baseSource,
    /evento\.stopPropagation\(\)/,
    "O clique de revisão deve permanecer isolado do abre/recolhe do card."
);
assert.doesNotMatch(
    baseSource,
    /setColaboradorRevisao|colaboradorRevisao\s*&&/,
    "A Base não pode manter estado local do modal."
);
console.log("I3_P1_F4_PAGE_OWNS_REVIEW_STATE=OK");
console.log("I3_P1_F4_CARD_CALLBACK_CONTRACT=OK");

assert.doesNotMatch(
    baseSource,
    /disabled=\{!podeRevisarTreinamentos\}/,
    "Abrir o painel não pode depender de um botão HTML nativamente disabled."
);
assert.doesNotMatch(
    baseSource,
    /podeRevisarTreinamentos\s*=\s*false/,
    "A Base não deve mais misturar permissão de execução com abertura do painel."
);
assert.match(
    baseSource,
    />\s*Revisar treinamentos\s*</,
    "O botão Revisar treinamentos deve continuar existindo no card."
);
console.log("I3_P1_F4_OPEN_BUTTON_ALWAYS_INTERACTIVE=OK");

const indicePainelRaiz = pageSource.indexOf("<RevisaoTreinamentosPainel");
const indiceModalDivergencia = pageSource.indexOf("<ModalDivergenciaFuncaoAso");
assert.ok(indicePainelRaiz >= 0, "TreinamentosPage deve montar o painel na raiz da página.");
assert.ok(
    indiceModalDivergencia < 0 || indicePainelRaiz < indiceModalDivergencia,
    "O painel deve ser montado na região global de modais, antes do ModalDivergenciaFuncaoAso."
);
assert.match(
    pageSource,
    /<RevisaoTreinamentosPainel[\s\S]*aberto=\{Boolean\(colaboradorRevisao\)\}[\s\S]*colaborador=\{colaboradorRevisao\}[\s\S]*podeExecutarPrevia=\{podeVisualizarTreinamentosSistema\}[\s\S]*podeConcluirRevisao=\{podeEditarTreinamentosSistema\}[\s\S]*onFechar=\{\(\) => setColaboradorRevisao\(null\)\}/,
    "O painel raiz deve receber permissões separadas para prévia e conclusão."
);
console.log("I3_P2_ROOT_MODAL_PERMISSIONS=OK");

assert.match(
    panelSource,
    /podeExecutarPrevia = true/,
    "O painel deve receber permissão separada para executar a prévia."
);
assert.match(
    panelSource,
    /if \(!colaboradorId \|\| ocupado \|\| !podeExecutarPrevia\) return;/,
    "A execução da prévia deve bloquear sem colaborador, durante outra operação ou sem permissão."
);
assert.match(
    panelSource,
    /disabled=\{!colaboradorId \|\| !podeExecutarPrevia\}/,
    "Somente o botão Iniciar revisão deve ser bloqueado pela permissão."
);
assert.match(
    panelSource,
    /O painel foi aberto, mas a execução da prévia não está liberada para este perfil\./,
    "Se a permissão não estiver disponível, o painel deve abrir e explicar o bloqueio."
);
console.log("I3_P1_F4_PERMISSION_MOVED_TO_EXECUTION=OK");

assert.match(
    panelSource,
    /podeConcluirRevisao = false/,
    "A conclusão deve receber permissão separada e conservadora por padrão."
);
assert.match(
    pageSource,
    /podeConcluirRevisao=\{podeEditarTreinamentosSistema\}/,
    "Concluir revisão deve depender de TREINAMENTOS.EDITAR."
);
assert.match(
    panelSource,
    /É necessária permissão de edição em Treinamentos para concluir a revisão\./,
    "A UI deve explicar quando o usuário não possui permissão de conclusão."
);
console.log("I3_P2_EDIT_PERMISSION_CONCLUSION=OK");

assert.match(
    panelSource,
    /prepararPreviaRevisaoTreinamentosService/,
    "O painel deve usar a orquestração canônica de prévia."
);
assert.match(
    panelSource,
    /concluirRevisaoTreinamentosService/,
    "I3-P2 deve usar o serviço canônico de conclusão, sem RPC direta na UI."
);
assert.doesNotMatch(
    panelSource,
    /\.rpc\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/,
    "O componente visual não pode escrever diretamente no Supabase."
);
console.log("I3_P2_CANONICAL_SERVICE_ONLY=OK");

const indiceHandler = panelSource.indexOf("const iniciarRevisao = async () =>");
const indiceChamada = panelSource.indexOf("await prepararPreviaRevisaoTreinamentosService({");
assert.ok(indiceHandler >= 0 && indiceChamada > indiceHandler, "A prévia deve iniciar somente dentro do handler explícito.");
assert.equal(
    (panelSource.match(/prepararPreviaRevisaoTreinamentosService\s*\(/g) || []).length,
    1,
    "A UI deve possuir exatamente uma chamada executável para preparar a prévia."
);
assert.match(panelSource, /onClick=\{iniciarRevisao\}/, "O reprocessamento deve depender de clique explícito.");
console.log("I3_P1_NO_EFFECT_AUTORUN=OK");

assert.match(panelSource, /resultado\?\.readOnly !== true/);
assert.match(panelSource, /Prévia somente leitura/);
assert.match(panelSource, /Esta etapa gera apenas uma prévia técnica\. Não conclui revisão, não gera PDF e não grava correções\./);
assert.match(panelSource, /A prévia continua somente leitura\. Somente a ação explícita de concluir cria um snapshot histórico/);
console.log("I3_P2_READONLY_PREVIEW_WRITE_SEPARATION=OK");

for (const status of [
    "CONFORME",
    "ATENÇÃO",
    "VENCIDO",
    "DIVERGENTE",
    "SEM EVIDÊNCIA SUFICIENTE",
    "REVISÃO MANUAL NECESSÁRIA",
]) {
    assert.ok(panelSource.includes(status), `Status obrigatório ausente no painel: ${status}`);
}
console.log("I3_P1_ALL_REVISION_STATUSES=OK");

assert.match(panelSource, /Status anterior/);
assert.match(panelSource, /Status reprocessado/);
assert.match(panelSource, /Realização salva/);
assert.match(panelSource, /Realização revisada/);
assert.match(panelSource, /Vencimento salvo/);
assert.match(panelSource, /Vencimento revisado/);
console.log("I3_P1_BEFORE_AFTER_COMPARISON=OK");

assert.match(panelSource, /Ver análise das evidências/);
assert.match(panelSource, /Documento \/ treinamento/);
assert.match(panelSource, /Nome do colaborador confirmado/);
assert.match(panelSource, /CPF confirmado no documento/);
assert.doesNotMatch(
    panelSource,
    /\{\s*evidencia\?\.identidadeEncontrada\?\.cpfCadastroConfirmado\s*\}/,
    "A UI não deve imprimir o CPF bruto confirmado."
);
assert.doesNotMatch(
    panelSource,
    /\.cpfsExtraidos\s*\.map\s*\(/,
    "A UI não deve listar CPFs extraídos."
);
console.log("I3_P1_IDENTITY_PRIVACY=OK");

assert.match(
    panelSource,
    /independentemente dos filtros aplicados à Base de Certificados/,
    "A UI deve deixar claro que a revisão ignora os filtros visuais da Base."
);
console.log("I3_P1_FILTER_SCOPE_DISCLOSURE=OK");

assert.match(panelSource, /Analisando evidências\.\.\./);
assert.match(panelSource, /Documentos reprocessados:/);
assert.match(panelSource, /Evidências de treinamento:/);
assert.match(panelSource, /Documentos contextuais:/);
assert.match(panelSource, /Falhas de reprocessamento:/);
assert.match(
    panelSource,
    /onProgresso:\s*\(evento = \{\}\) =>/,
    "A UI deve consumir o callback real de progresso fornecido pelo serviço."
);
assert.match(panelSource, /aria-valuenow=\{percentualProgressoAnalise\}/);
assert.match(panelSource, /evidências analisadas/);
assert.match(panelSource, /A porcentagem avança somente quando uma evidência termina de ser analisada\./);
assert.doesNotMatch(
    panelSource,
    /setInterval\s*\(|setTimeout\s*\([^)]*setProgresso|percentualProgressoAnalise\s*\+/,
    "A porcentagem não pode avançar por temporizador nem incremento visual artificial."
);
console.log("I3_P2_F2_REAL_PROGRESS_UI=OK");

assert.match(panelSource, /data-progresso-circular-animado/);
assert.match(panelSource, /strokeDasharray:\s*progressoCircunferencia/);
assert.match(panelSource, /strokeDashoffset:\s*progressoOffset/);
assert.match(panelSource, /rotate\(-90deg\)/);
assert.match(
    panelSource,
    /stroke-dashoffset 420ms cubic-bezier\(0\.22, 1, 0\.36, 1\)/,
    "O arco circular deve suavizar apenas a transição entre percentuais reais."
);
assert.doesNotMatch(
    panelSource,
    /animation:\s*["'`][^"'`]*infinite|animate-spin[^\n]*data-progresso-circular-animado/,
    "O progresso circular não pode girar indefinidamente nem simular avanço."
);
console.log("I3_P2_F3_CIRCULAR_PROGRESS_ANIMATION=OK");

assert.match(panelSource, /Repetir prévia/);
assert.match(panelSource, /Concluir e registrar revisão/);
assert.match(panelSource, /Confirmar registro desta revisão\?/);
assert.match(panelSource, /onClick=\{\(\) => setConfirmandoConclusao\(true\)\}/);
assert.match(panelSource, /onClick=\{concluirRevisao\}/);
assert.match(panelSource, /confirmarConclusao:\s*true/);
assert.match(panelSource, /decisoesHumanas:\s*\{\}/);
assert.match(panelSource, /snapshot imutável/i);
assert.match(panelSource, /Itens de revisão manual continuarão registrados como pendência/);
console.log("I3_P2_EXPLICIT_CONFIRMATION_UI=OK");

const indiceConclusaoHandler = panelSource.indexOf("const concluirRevisao = async () =>");
const indiceConclusaoCall = panelSource.indexOf("await concluirRevisaoTreinamentosService({");
assert.ok(
    indiceConclusaoHandler >= 0 && indiceConclusaoCall > indiceConclusaoHandler,
    "A conclusão deve existir apenas dentro do handler explícito."
);
assert.equal(
    (panelSource.match(/concluirRevisaoTreinamentosService\s*\(/g) || []).length,
    1,
    "A UI deve possuir exatamente uma chamada executável ao serviço de conclusão."
);
assert.doesNotMatch(
    panelSource,
    /setInterval\s*\(|while\s*\(|for\s*\([^)]*concluirRevisaoTreinamentosService/,
    "A UI não pode criar retry automático da escrita."
);
console.log("I3_P2_SINGLE_WRITE_NO_AUTORETRY=OK");

assert.match(panelSource, /resultadoDesconhecido === true/);
assert.match(panelSource, /setResultadoConclusaoDesconhecido\(true\)/);
assert.match(panelSource, /setConfirmandoConclusao\(false\)/);
assert.match(panelSource, /disabled=\{!podeConcluirRevisao \|\| ocupado \|\| resultadoConclusaoDesconhecido\}/);
assert.match(panelSource, /Não repita esta ação automaticamente/);
assert.match(panelSource, /A revisão deverá ser conferida no histórico antes de uma nova tentativa/);
console.log("I3_P2_UNKNOWN_RESULT_GUARD=OK");

assert.match(panelSource, /Revisão #\{Number\(conclusao\?\.numero_revisao/);
assert.match(panelSource, /Snapshot auditável persistido/);
assert.match(panelSource, /ID: \{textoSeguro\(conclusao\?\.revisao_id\)\}/);
assert.match(panelSource, /resultadoConclusaoDesconhecido/);
assert.match(panelSource, /conclusao \|\|[\s\S]*resultadoConclusaoDesconhecido \|\|[\s\S]*!podeConcluirRevisao/);
console.log("I3_P2_SUCCESS_DUPLICATION_GUARD=OK");

assert.doesNotMatch(panelSource, /Gerar PDF da revisão|Abrir PDF|Comparar revisões/);
console.log("I3_P4_NO_PDF_COMPARE_ACTION_YET=OK");

assert.match(
    panelSource,
    /const percentualConformidadePrevia = formatarPercentual\(previa\?\.percentualConformidade\);/,
    "A conformidade exibida no registro deve reutilizar exatamente o percentual calculado pela prévia."
);
assert.match(
    panelSource,
    /const totalTreinamentosPrevia = Number\(previa\?\.totalTreinamentosLogicos \|\| 0\);/,
    "O denominador mostrado no registro deve vir da mesma prévia."
);
assert.match(
    panelSource,
    /const totalConformesPrevia = Number\(previa\?\.resumo\?\.CONFORME \|\| 0\);/,
    "O total de conformes mostrado no registro deve vir do resumo da mesma prévia."
);
assert.match(panelSource, /data-revisao-conformidade-registro/);
assert.match(panelSource, /Conformidade desta revisão/);
assert.match(panelSource, /data-revisao-conformidade-confirmacao/);
assert.match(panelSource, /Conformidade da avaliação/);
assert.ok(
    (panelSource.match(/\{percentualConformidadePrevia\}/g) || []).length >= 3,
    "Resumo, registro e confirmação devem compartilhar o mesmo percentual formatado."
);
assert.doesNotMatch(
    panelSource,
    /percentualConformidadeRegistro|percentualConfirmacao|calcular.*Conformidade/i,
    "A I3-P2-F1 não pode criar um cálculo paralelo de conformidade."
);
console.log("I3_P2_F1_SHARED_CONFORMITY_SOURCE=OK");
console.log("I3_P2_F1_REGISTRATION_PERCENTAGE=OK");
console.log("I3_P2_F1_CONFIRMATION_PERCENTAGE=OK");
console.log("I3_P2_F1_NO_PARALLEL_CONFORMITY_CALC=OK");

assert.doesNotMatch(
    panelSource,
    /transition-\[width\]|style=\{\{ width: `\$\{percentualProgressoAnalise\}%` \}\}/,
    "A barra horizontal de carregamento deve ser removida; o círculo é o único indicador visual percentual."
);
assert.match(panelSource, /data-progresso-circular-animado[\s\S]*role="progressbar"/);
console.log("I3_P2_F4_LOADING_CIRCLE_ONLY=OK");

assert.match(panelSource, /const html = document\.documentElement;/);
assert.match(panelSource, /body\.style\.overflow = "hidden";/);
assert.match(panelSource, /html\.style\.overflow = "hidden";/);
assert.match(panelSource, /body\.style\.overscrollBehavior = "none";/);
assert.match(panelSource, /html\.style\.overscrollBehavior = "none";/);
assert.match(panelSource, /body\.style\.overflow = overflowBodyAnterior;/);
assert.match(panelSource, /html\.style\.overflow = overflowHtmlAnterior;/);
assert.match(panelSource, /body\.style\.paddingRight = paddingRightAnterior;/);
console.log("I3_P2_F4_BACKGROUND_SCROLL_LOCK=OK");

assert.match(panelSource, /data-resumo-previa-scroll/);
assert.match(panelSource, /data-treinamentos-avaliados-scroll/);
assert.match(
    panelSource,
    /className="[^"]*xl:overflow-y-auto[^"]*"[\s\S]*data-resumo-previa-scroll/,
    "A coluna Resumo da prévia deve possuir rolagem própria no desktop."
);
assert.match(
    panelSource,
    /className="[^"]*xl:overflow-y-auto[^"]*"[\s\S]*data-treinamentos-avaliados-scroll/,
    "A coluna Treinamentos avaliados deve possuir rolagem própria no desktop."
);
assert.match(panelSource, /xl:overscroll-contain/);
console.log("I3_P2_F4_INDEPENDENT_PANEL_SCROLLS=OK");

assert.match(panelSource, /HistoricoRevisoesTreinamentosDrawer/);
assert.match(panelSource, /Histórico de revisões/);
assert.match(panelSource, /data-abrir-historico-revisoes/);
assert.match(panelSource, /setHistoricoAberto\(true\)/);
assert.match(panelSource, /fechamentoPainelBloqueado = ocupado \|\| historicoAberto/);
assert.match(
    panelSource,
    /<HistoricoRevisoesTreinamentosDrawer[\s\S]*supabase=\{supabase\}[\s\S]*colaborador=\{colaborador\}[\s\S]*onFechar=\{\(\) => setHistoricoAberto\(false\)\}/,
    "O painel deve montar o histórico somente quando solicitado e manter o colaborador corrente."
);
console.log("I3_P4_HISTORY_ENTRYPOINT=OK");

assert.match(historySource, /listarHistoricoRevisoesTreinamentosService/);
assert.match(historySource, /obterHistoricoRevisaoTreinamentosService/);
assert.match(historySource, /Histórico de revisões/);
assert.match(historySource, /Abrir revisão/);
assert.match(historySource, /snapshot imutável/i);
assert.match(historySource, /Consulta somente leitura/);
assert.doesNotMatch(
    historySource,
    /\.rpc\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/,
    "O componente de histórico não pode executar escrita direta."
);
assert.doesNotMatch(historySource, /Gerar PDF|Comparar revisões/);
console.log("I3_P4_HISTORY_DRAWER_READONLY=OK");

assert.match(serviceSource, /export async function listarHistoricoRevisoesTreinamentosService/);
assert.match(serviceSource, /export async function obterHistoricoRevisaoTreinamentosService/);
assert.match(serviceSource, /\.eq\("status", "concluida"\)/);
assert.match(serviceSource, /\.from\("treinamentos_revisao_itens"\)/);
assert.match(serviceSource, /\.from\("treinamentos_revisao_evidencias"\)/);
assert.doesNotMatch(
    serviceSource,
    /listarHistoricoRevisoesTreinamentosService[\s\S]{0,5000}\.rpc\s*\(/,
    "Listagem histórica deve permanecer read-only."
);
console.log("I3_P4_HISTORY_SERVICE_READONLY=OK");

assert.match(panelSource, /totalEvidenciasTreinamentoPrevia/);
assert.match(panelSource, /totalDocumentosContextuais/);
assert.match(panelSource, /Documentos reprocessados:/);
assert.match(panelSource, /Evidências de treinamento:/);
assert.match(panelSource, /Documentos contextuais:/);
console.log("I3_P4_EXECUTION_COUNTS_CLARIFIED=OK");

console.log("SAFESCAN_TREINAMENTOS_REVISAO_I3_P2_F4_UI_SMOKE_OK");
console.log("SAFESCAN_TREINAMENTOS_REVISAO_I3_P4_UI_SMOKE_OK");
