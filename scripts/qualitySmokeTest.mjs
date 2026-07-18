import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    listarExtintoresVistoria,
    proximoCodigoExtintor,
    salvarExtintoresVistoria,
    TIPOS_EXTINTORES_BRASIL,
} from "../src/services/extintoresVistoriaService.js";
import {
    lerMapaObraLocal,
    listarMapasObraLocal,
    salvarMapaObraLocal,
} from "../src/services/mapaObraLocalService.js";
import {
    ACOES_CRITICAS_PERMISSAO_SISTEMA,
    ACOES_PERMISSAO_SISTEMA,
    MODULOS_PERMISSAO_SISTEMA,
    obterBloqueioVisualAcaoCriticaSistema,
    obterModuloPermissaoSistemaPorTela,
    usuarioPodeAcessarTelaSistema,
    usuarioPodeAlterarConfiguracoesCriticasSistema,
    usuarioPodeExecutarAcaoSistema,
    usuarioPodeExcluirSistema,
    usuarioPodeGerenciarPermissoesSistema,
    usuarioPodeLimparArquivosSistema,
} from "../src/services/usuariosPermissoesSistemaService.js";
import {
    normalizarAjusteFundoLoginService,
} from "../src/services/fundoLoginPublicoService.js";

assert.equal(
    proximoCodigoExtintor([{ codigo: "E-001" }, { codigo: "E-002" }, { codigo: "E-004" }]),
    "E-03",
    "O cadastro deve reutilizar o primeiro codigo disponivel."
);
assert.equal(proximoCodigoExtintor([]), "E-01");
assert.equal(proximoCodigoExtintor([{ codigo: "E-01" }, { codigo: "E-03" }]), "E-02");
assert.equal(proximoCodigoExtintor([{ codigo: "extintor 1" }, { codigo: "E-02" }]), "E-03");
assert.ok(TIPOS_EXTINTORES_BRASIL.some((tipo) => tipo.valor === "CO2"));
assert.ok(TIPOS_EXTINTORES_BRASIL.some((tipo) => tipo.valor === "PQS ABC"));

assert.deepEqual(
    normalizarAjusteFundoLoginService({
        size: "115% auto",
        position: "center 30%",
        overlay: 0.9,
    }),
    {
        size: "115% auto",
        position: "center 30%",
        overlay: 0.82,
    },
    "O ajuste do fundo deve preservar opções válidas e limitar o contraste."
);
assert.deepEqual(
    normalizarAjusteFundoLoginService({
        size: "valor-invalido",
        position: "posição-inválida",
        overlay: "inválido",
    }),
    {
        size: "cover",
        position: "center center",
        overlay: 0.62,
    },
    "Valores inválidos do fundo devem retornar ao padrão seguro."
);

const usuarioConsulta = { perfil: "consulta", ativo: true, bloqueado: false };
const usuarioTecnico = { perfil: "tecnico_sst", ativo: true, bloqueado: false };
const usuarioAuditor = { perfil: "auditor", ativo: true, bloqueado: false };
const usuarioAdministrador = { perfil: "administrador", ativo: true, bloqueado: false };

assert.equal(
    usuarioPodeExecutarAcaoSistema(
        usuarioConsulta,
        MODULOS_PERMISSAO_SISTEMA.DASHBOARD_SST,
        ACOES_PERMISSAO_SISTEMA.VISUALIZAR
    ),
    true,
    "Consulta deve visualizar o dashboard."
);
assert.equal(
    usuarioPodeExecutarAcaoSistema(
        usuarioConsulta,
        MODULOS_PERMISSAO_SISTEMA.EMPRESAS,
        ACOES_PERMISSAO_SISTEMA.EDITAR
    ),
    false,
    "Consulta nao deve editar empresas."
);
assert.equal(
    usuarioPodeExecutarAcaoSistema(
        usuarioAdministrador,
        MODULOS_PERMISSAO_SISTEMA.EMPRESAS,
        ACOES_PERMISSAO_SISTEMA.EDITAR
    ),
    true,
    "Administrador deve editar empresas."
);
assert.equal(
    usuarioPodeExecutarAcaoSistema(
        { perfil: "administrador", ativo: false, bloqueado: true },
        MODULOS_PERMISSAO_SISTEMA.EMPRESAS,
        ACOES_PERMISSAO_SISTEMA.EDITAR
    ),
    false,
    "Usuario bloqueado nao deve executar acoes."
);
assert.equal(
    usuarioPodeExecutarAcaoSistema(
        usuarioTecnico,
        MODULOS_PERMISSAO_SISTEMA.VISTORIA_EDITAR,
        ACOES_PERMISSAO_SISTEMA.EDITAR
    ),
    true,
    "Tecnico SST deve editar vistorias."
);
assert.equal(
    usuarioPodeExecutarAcaoSistema(
        usuarioAuditor,
        MODULOS_PERMISSAO_SISTEMA.VISTORIA_EDITAR,
        ACOES_PERMISSAO_SISTEMA.EDITAR
    ),
    false,
    "Auditor nao deve editar o cadastro de vistorias."
);
assert.equal(
    usuarioPodeExecutarAcaoSistema(
        usuarioAuditor,
        MODULOS_PERMISSAO_SISTEMA.VISTORIA_VISUALIZAR,
        ACOES_PERMISSAO_SISTEMA.VISUALIZAR
    ),
    true,
    "Auditor deve consultar vistorias."
);

assert.equal(obterModuloPermissaoSistemaPorTela("mapaObra"), MODULOS_PERMISSAO_SISTEMA.VISTORIA_EDITAR);
assert.equal(
    obterModuloPermissaoSistemaPorTela("mapaObraVisualizacao"),
    MODULOS_PERMISSAO_SISTEMA.VISTORIA_VISUALIZAR
);
assert.equal(usuarioPodeAcessarTelaSistema(usuarioConsulta, "mapaObra"), false);
assert.equal(usuarioPodeAcessarTelaSistema(usuarioConsulta, "mapaObraVisualizacao"), true);

const matrizTelasPorPerfil = [
    {
        nome: "consulta",
        usuario: usuarioConsulta,
        permitidas: ["dashboard", "empresas", "colaboradores", "treinamentos", "dds", "qr", "mapaObraVisualizacao"],
        bloqueadas: ["dashboardAuditoria", "novaAuditoria", "extintores", "mapaObra", "auditoriaSistema", "acessosApp", "configuracoes"],
    },
    {
        nome: "auditor",
        usuario: usuarioAuditor,
        permitidas: ["dashboardAuditoria", "novaAuditoria", "qr", "mapaObraVisualizacao"],
        bloqueadas: ["dashboard", "empresas", "colaboradores", "treinamentos", "extintores", "mapaObra", "auditoriaSistema", "acessosApp", "configuracoes"],
    },
    {
        nome: "tecnico SST",
        usuario: usuarioTecnico,
        permitidas: ["dashboard", "empresas", "colaboradores", "treinamentos", "dds", "qr", "dashboardAuditoria", "novaAuditoria", "extintores", "mapaObra", "mapaObraVisualizacao"],
        bloqueadas: ["auditoriaSistema", "acessosApp", "configuracoes"],
    },
];

for (const perfil of matrizTelasPorPerfil) {
    for (const telaPermitida of perfil.permitidas) {
        assert.equal(
            usuarioPodeAcessarTelaSistema(perfil.usuario, telaPermitida),
            true,
            `${perfil.nome} deve acessar ${telaPermitida}.`
        );
    }

    for (const telaBloqueada of perfil.bloqueadas) {
        assert.equal(
            usuarioPodeAcessarTelaSistema(perfil.usuario, telaBloqueada),
            false,
            `${perfil.nome} nao deve acessar ${telaBloqueada}.`
        );
    }
}

for (const telaAdministrativa of [
    "dashboard",
    "empresas",
    "colaboradores",
    "treinamentos",
    "qr",
    "dashboardAuditoria",
    "novaAuditoria",
    "extintores",
    "mapaObra",
    "mapaObraVisualizacao",
    "auditoriaSistema",
    "acessosApp",
    "configuracoes",
]) {
    assert.equal(
        usuarioPodeAcessarTelaSistema(usuarioAdministrador, telaAdministrativa),
        true,
        `Administrador deve acessar ${telaAdministrativa}.`
    );
}

for (const usuarioSemPrivilegio of [usuarioConsulta, usuarioAuditor, usuarioTecnico]) {
    assert.equal(usuarioPodeExcluirSistema(usuarioSemPrivilegio), false);
    assert.equal(usuarioPodeLimparArquivosSistema(usuarioSemPrivilegio), false);
    assert.equal(usuarioPodeGerenciarPermissoesSistema(usuarioSemPrivilegio), false);
    assert.equal(usuarioPodeAlterarConfiguracoesCriticasSistema(usuarioSemPrivilegio), false);
}

assert.equal(usuarioPodeExcluirSistema(usuarioAdministrador), true);
assert.equal(usuarioPodeLimparArquivosSistema(usuarioAdministrador), true);
assert.equal(usuarioPodeGerenciarPermissoesSistema(usuarioAdministrador), true);
assert.equal(usuarioPodeAlterarConfiguracoesCriticasSistema(usuarioAdministrador), true);

const usuarioComPermissaoEspecifica = {
    perfil: "consulta",
    ativo: true,
    bloqueado: false,
    permissoes: {
        modulos: {
            [MODULOS_PERMISSAO_SISTEMA.NOVA_AUDITORIA]: {
                [ACOES_PERMISSAO_SISTEMA.VISUALIZAR]: true,
                [ACOES_PERMISSAO_SISTEMA.CADASTRAR]: "true",
            },
        },
    },
};

assert.equal(usuarioPodeAcessarTelaSistema(usuarioComPermissaoEspecifica, "novaAuditoria"), true);
assert.equal(
    usuarioPodeExecutarAcaoSistema(
        usuarioComPermissaoEspecifica,
        MODULOS_PERMISSAO_SISTEMA.NOVA_AUDITORIA,
        ACOES_PERMISSAO_SISTEMA.CADASTRAR
    ),
    true,
    "Permissao individual explicita deve complementar o perfil padrao."
);

const bloqueioExclusaoConsulta = obterBloqueioVisualAcaoCriticaSistema(
    usuarioConsulta,
    ACOES_CRITICAS_PERMISSAO_SISTEMA.EXCLUIR
);
assert.equal(bloqueioExclusaoConsulta.bloqueado, true);
assert.equal(bloqueioExclusaoConsulta.disabled, true);

const codigoAppLayout = readFileSync(
    new URL("../src/components/layout/AppLayout.jsx", import.meta.url),
    "utf8"
);
const codigoApp = readFileSync(
    new URL("../src/App.jsx", import.meta.url),
    "utf8"
);
const codigoAppContentRouter = readFileSync(
    new URL("../src/routes/AppContentRouter.jsx", import.meta.url),
    "utf8"
);
const codigoConfiguracoesSistema = readFileSync(
    new URL("../src/components/configuracoes/ConfiguracoesSistema.jsx", import.meta.url),
    "utf8"
);
const codigoArquivosStorageConfiguracoes = readFileSync(
    new URL("../src/components/configuracoes/ArquivosStorageConfiguracoes.jsx", import.meta.url),
    "utf8"
);
const codigoStorageAuditoriaService = readFileSync(
    new URL("../src/services/storageAuditoriaService.js", import.meta.url),
    "utf8"
);
const codigoQrCodeComLogo = readFileSync(
    new URL("../src/components/qr/QrCodeComLogo.jsx", import.meta.url),
    "utf8"
);
const codigoEmpresasPage = readFileSync(
    new URL("../src/components/empresas/EmpresasPage.jsx", import.meta.url),
    "utf8"
);
const codigoColaboradoresPage = readFileSync(
    new URL("../src/components/colaboradores/ColaboradoresPage.jsx", import.meta.url),
    "utf8"
);
const codigoTreinamentosPage = readFileSync(
    new URL("../src/components/treinamentos/TreinamentosPage.jsx", import.meta.url),
    "utf8"
);
const codigoBaseCertificadosTreinamentos = readFileSync(
    new URL("../src/components/treinamentos/BaseCertificadosTreinamentos.jsx", import.meta.url),
    "utf8"
);
const codigoDashboardResumoService = readFileSync(
    new URL("../src/services/dashboardResumoService.js", import.meta.url),
    "utf8"
);
const codigoDashboard = readFileSync(
    new URL("../src/components/dashboard/Dashboard.jsx", import.meta.url),
    "utf8"
);
const codigoDashboardAlertas = readFileSync(
    new URL("../src/components/dashboard/DashboardAlertas.jsx", import.meta.url),
    "utf8"
);
const codigoDashboardCartaResumoModal = readFileSync(
    new URL("../src/components/dashboard/DashboardCartaResumoModal.jsx", import.meta.url),
    "utf8"
);
const codigoDashboardService = readFileSync(
    new URL("../src/services/dashboardService.js", import.meta.url),
    "utf8"
);
const codigoColaboradorDocumentosService = readFileSync(
    new URL("../src/services/colaboradorDocumentosService.js", import.meta.url),
    "utf8"
);
const codigoLoginScreen = readFileSync(
    new URL("../src/components/LoginScreen.jsx", import.meta.url),
    "utf8"
);
const codigoFundoLoginPublicoService = readFileSync(
    new URL("../src/services/fundoLoginPublicoService.js", import.meta.url),
    "utf8"
);
const codigoSupabaseClient = readFileSync(
    new URL("../src/lib/supabaseClient.js", import.meta.url),
    "utf8"
);
const codigoAppColaboradoresHandlersService = readFileSync(
    new URL("../src/services/appColaboradoresHandlersService.js", import.meta.url),
    "utf8"
);
const migracaoFundoLoginPublico = readFileSync(
    new URL("../supabase/migrations/20260717115604_obter_estado_fundo_login_publico.sql", import.meta.url),
    "utf8"
);
const migracaoFundoLoginConfiguracaoBanco = readFileSync(
    new URL("../supabase/migrations/20260717202022_configuracao_fundo_login_banco.sql", import.meta.url),
    "utf8"
);
const roteiroFundoLoginConfiguracaoBanco = readFileSync(
    new URL("../supabase/sql/etapa104_configuracao_fundo_login_banco.sql", import.meta.url),
    "utf8"
);
const migracaoFundoLoginRestricaoAnon = readFileSync(
    new URL("../supabase/migrations/20260717202931_restringir_rpcs_fundo_login_anon.sql", import.meta.url),
    "utf8"
);
const roteiroFundoLoginRestricaoAnon = readFileSync(
    new URL("../supabase/sql/etapa104b_restringir_rpcs_fundo_login_anon.sql", import.meta.url),
    "utf8"
);
const regraTrabalho = readFileSync(
    new URL("../docs/regra-de-trabalho-e-publicacao.md", import.meta.url),
    "utf8"
);

assert.match(
    codigoAppLayout,
    /data-testid="app-tab-loading-overlay"/,
    "A tela de carregamento obrigatoria das trocas de aba nao pode ser removida."
);
assert.match(
    codigoApp,
    /permissaoSistemaUsuario=\{permissaoSistemaUsuario\}[\s\S]*carregandoPermissaoSistemaUsuario=\{carregandoPermissaoSistemaUsuario\}[\s\S]*erroPermissaoSistemaUsuario=\{erroPermissaoSistemaUsuario\}/,
    "O App deve entregar ao layout o estado central de permissões."
);
assert.match(
    codigoAppLayout,
    /const permissaoSistemaMenu = permissaoSistemaUsuario;/,
    "O layout deve consumir a permissão já carregada pelo App."
);
assert.doesNotMatch(
    codigoAppLayout,
    /carregarPermissaoSistemaAtualService|setPermissaoSistemaMenu|setCarregandoPermissaoSistemaMenu|setErroPermissaoSistemaMenu/,
    "O layout não pode voltar a carregar permissões em uma RPC própria."
);
assert.match(
    codigoAppContentRouter,
    /<Empresas[\s\S]*permissaoSistemaUsuario=\{permissaoSistemaTela\}/,
    "O roteador deve repassar a permissão central para a página de Empresas."
);
assert.match(
    codigoEmpresasPage,
    /const permissaoSistemaAtual = permissaoSistemaUsuario;/,
    "Empresas deve consumir a permissão central já validada."
);
assert.doesNotMatch(
    codigoEmpresasPage,
    /carregarPermissaoSistemaAtualService|setPermissaoSistemaAtual|setMensagemPermissaoSistema/,
    "Empresas não pode voltar a carregar permissões em uma consulta própria."
);
assert.match(
    codigoAppContentRouter,
    /<Colaboradores[\s\S]*permissaoSistemaUsuario=\{permissaoSistemaTela\}/,
    "O roteador deve repassar a permissão central para a página de Colaboradores."
);
assert.match(
    codigoColaboradoresPage,
    /const permissaoSistemaAtual = permissaoSistemaUsuario;/,
    "Colaboradores deve consumir a permissão central já validada."
);
assert.doesNotMatch(
    codigoColaboradoresPage,
    /carregarPermissaoSistemaAtualService|setPermissaoSistemaAtual|setMensagemPermissaoSistema|from "\.\.\/\.\.\/lib\/supabaseClient"/,
    "Colaboradores não pode voltar a carregar permissões em uma consulta própria."
);
assert.match(
    codigoAppContentRouter,
    /<Treinamentos[\s\S]*permissaoSistemaUsuario=\{permissaoSistemaTela\}/,
    "O roteador deve repassar a permissão central para a página de Treinamentos."
);
assert.match(
    codigoTreinamentosPage,
    /const permissaoSistemaAtual = permissaoSistemaUsuario;/,
    "Treinamentos deve consumir a permissão central já validada."
);
assert.doesNotMatch(
    codigoTreinamentosPage,
    /carregarPermissaoSistemaAtualService|setPermissaoSistemaAtual|setMensagemPermissaoSistema/,
    "Treinamentos não pode voltar a carregar permissões em uma consulta própria."
);
assert.match(
    codigoTreinamentosPage,
    /supabase\.functions\.invoke\(FUNCAO_EMAIL_ALERTA_TST/,
    "Treinamentos deve preservar o envio de alertas TST pela Edge Function."
);
assert.match(
    codigoTreinamentosPage,
    /colaboradorForaControleDocumentalOperacional\(documento\.colaborador\)[\s\S]*filtroStatusCertificados === "Todos"[\s\S]*!foraControleOperacional/,
    "A Base deve manter o histórico apenas no filtro Todos e removê-lo dos filtros operacionais."
);
assert.match(
    codigoTreinamentosPage,
    /if \(colaboradorForaControleDocumentalOperacional\(documento\.colaborador\)\) \{[\s\S]*return acc;/,
    "Os totais de certificados não podem contabilizar históricos desmobilizados ou inativos."
);
assert.match(
    codigoTreinamentosPage,
    /colaboradores\.forEach\(\(colaborador\) => \{[\s\S]*if \(colaboradorForaControleDocumentalOperacional\(colaborador\)\) return;[\s\S]*colaborador\.treinamentos/,
    "Alertas ao TST não podem incluir colaboradores desmobilizados ou inativos."
);
assert.match(
    codigoBaseCertificadosTreinamentos,
    /Histórico · \{situacaoHistorica\}/,
    "A Base de Certificados deve identificar visualmente o grupo mantido apenas como histórico."
);
assert.match(
    codigoBaseCertificadosTreinamentos,
    /const resumoStatus = foraControleOperacional[\s\S]*\? \{ emDia: 0, aVencer: 0, vencidos: 0 \}/,
    "O grupo histórico não pode exibir badges operacionais de vencimento."
);
assert.match(
    codigoDashboardResumoService,
    /const colaboradoresOperacionais = colaboradores\.filter[\s\S]*!colaboradorForaControleDocumentalOperacional\(colaborador\)/,
    "O Dashboard SST deve calcular indicadores somente com colaboradores em controle operacional."
);
assert.match(
    codigoDashboardResumoService,
    /function colaboradorElegivelAniversarioDashboard[\s\S]*deveMostrarAniversarioColaborador\(colaborador\)[\s\S]*extrairDataNascimentoColaborador\(colaborador\)[\s\S]*!situacaoCadastro\.includes\("inativo"\)[\s\S]*!situacaoCadastro\.includes\("desmobilizado"\)/,
    "Aniversariantes devem considerar o cadastro ativo, independentemente do bloqueio documental."
);
assert.match(
    codigoDashboardResumoService,
    /const aniversariantesElegiveis = colaboradores[\s\S]*\.filter\(colaboradorElegivelAniversarioDashboard\)/,
    "O resumo deve usar a regra de cadastro ativo para aniversariantes."
);
assert.match(
    codigoDashboardResumoService,
    /normalizarStatusEmpresa\(empresa\.status\) === "Ativa"/,
    "O card Empresas ativas deve comparar com a classificação normalizada correta."
);
assert.match(
    codigoDashboardResumoService,
    /const proximoAniversarioCalculado = proximoAniversariante\(aniversariantesElegiveis\);[\s\S]*proximoAniversarioCalculado\?\.colaborador \|\| null/,
    "O próximo aniversariante deve expor o colaborador e não o objeto intermediário."
);
assert.match(
    codigoDashboardResumoService,
    /const documentosFuncionariosVencidos = pendencias\.filter[\s\S]*item\.status\.chave === "vencido"/,
    "O Dashboard deve separar documentos vencidos de funcionários."
);
assert.match(
    codigoDashboardResumoService,
    /const documentosFuncionariosAVencer30Dias = pendencias\.filter[\s\S]*dias >= 0 && dias <= 30/,
    "Documentos de funcionários a vencer devem usar a janela de trinta dias."
);
assert.match(
    codigoDashboardResumoService,
    /tipo: "Documento de funcionário vencido"[\s\S]*data: `Vencimento: \$\{formatDate\(item\.vencimento\)\}`/,
    "Alertas vencidos de funcionários devem exibir a data do documento."
);
assert.match(
    codigoDashboardResumoService,
    /tipo: "Documento de funcionário a vencer"[\s\S]*faltam \$\{dias\} dia\(s\)/,
    "Alertas a vencer devem exibir data e dias restantes."
);
assert.match(
    codigoDashboard,
    /documentosFuncionariosAVencer30Dias\.length[\s\S]*Docs func\. a vencer[\s\S]*Próximos 30 dias/,
    "O novo card de documentos de funcionários a vencer deve permanecer visível."
);
assert.match(
    codigoDashboardService,
    /documentosFuncionariosAVencer: true[\s\S]*documentosFuncionariosAVencer: "padrao"[\s\S]*"documentosFuncionariosAVencer"/,
    "A personalização do Dashboard deve registrar o novo card."
);
assert.match(
    codigoDashboardAlertas,
    /\{item\.data && \([\s\S]*\{item\.data\}/,
    "O bloco de alertas deve renderizar a data em linha própria."
);
assert.match(
    codigoDashboard,
    /CHAVES_CARTAS_COM_RESUMO[\s\S]*"documentosVencidos"[\s\S]*"documentosAVencer"[\s\S]*"treinamentosVencidos"[\s\S]*"documentosFuncionariosAVencer"[\s\S]*"aniversariantesMes"/,
    "Cards documentais e aniversariantes devem permanecer registrados para resumo."
);
assert.match(
    codigoDashboard,
    /onClick=\{podeAbrirResumo[\s\S]*abrirResumoCartaDashboard\(item\.chave\)[\s\S]*role=\{podeAbrirResumo \? "button"/,
    "Os cards com resumo devem funcionar por clique e manter acessibilidade."
);
assert.match(
    codigoDashboard,
    /<DashboardCartaResumoModal[\s\S]*resumo=\{resumoCartaDashboard\}[\s\S]*setResumoCartaDashboard\(null\)/,
    "O Dashboard deve montar e fechar o resumo dos cards."
);
assert.match(
    codigoDashboardCartaResumoModal,
    /role="dialog"[\s\S]*aria-modal="true"[\s\S]*Nenhum item encontrado[\s\S]*item\.dataValor/,
    "O modal deve possuir diálogo acessível, estado vazio e dados detalhados."
);
assert.match(
    codigoDashboardCartaResumoModal,
    /nova-auditoria-hero-bg\.webp[\s\S]*backgroundImage: `url\(\$\{resumoDashboardHero\}\)`[\s\S]*linear-gradient/,
    "O resumo deve manter um hero fotográfico próprio com overlay de contraste."
);
assert.match(
    codigoDashboard,
    /horasTrabalhadasMes[\s\S]*Total de horas trabalhadas no mês[\s\S]*valor: "—"[\s\S]*Integração futura com DDS/,
    "O card futuro de horas trabalhadas não pode apresentar um total inventado."
);
assert.match(
    codigoDashboardService,
    /horasTrabalhadasMes: true[\s\S]*horasTrabalhadasMes: "padrao"[\s\S]*"horasTrabalhadasMes"/,
    "O card futuro de horas trabalhadas deve permanecer personalizável."
);
assert.match(
    codigoColaboradorDocumentosService,
    /export function obterSituacaoHistoricaTreinamentosColaborador[\s\S]*desmobilizado[\s\S]*return "Desmobilizado"[\s\S]*inativo[\s\S]*return "Inativo"/,
    "O serviço deve reconhecer Desmobilizado e Inativo como situações históricas."
);
assert.match(
    codigoColaboradorDocumentosService,
    /export function colaboradorForaControleDocumentalOperacional[\s\S]*obterSituacaoHistoricaTreinamentosColaborador/,
    "A decisão de retirar o colaborador do controle operacional deve permanecer centralizada."
);
assert.match(
    codigoColaboradorDocumentosService,
    /const pendentes = foraControleOperacional \? \[\] : pendentesCalculados[\s\S]*const vencidos = foraControleOperacional \? \[\] : vencidosCalculados[\s\S]*const vencendo = foraControleOperacional \? \[\] : vencendoCalculados[\s\S]*const emDia = foraControleOperacional \? \[\] : emDiaCalculados/,
    "A avaliação deve zerar somente os indicadores operacionais e preservar os itens históricos."
);
assert.match(
    codigoColaboradorDocumentosService,
    /situacaoHistorica,[\s\S]*foraControleOperacional,[\s\S]*itens,/,
    "A avaliação deve expor a situação histórica sem apagar os itens documentais."
);
assert.match(
    codigoAppContentRouter,
    /<ConfiguracoesSistema[\s\S]*permissaoSistemaUsuario=\{permissaoSistemaTela\}/,
    "O roteador deve repassar a permissão central para Configurações."
);
assert.match(
    codigoConfiguracoesSistema,
    /const permissaoSistemaAtual = permissaoSistemaUsuario;/,
    "Configurações deve consumir a permissão central já validada."
);
assert.doesNotMatch(
    codigoConfiguracoesSistema,
    /carregarPermissaoSistemaAtualService|setPermissaoSistemaAtual|setCarregandoPermissaoSistema|setMensagemPermissaoSistema/,
    "Configurações não pode voltar a carregar permissões em uma consulta própria."
);
assert.match(
    codigoConfiguracoesSistema,
    /carregarFundoLoginPublicoService\(\{[\s\S]*supabase/,
    "Configurações deve preservar o carregamento seguro do fundo do login."
);
assert.match(
    codigoConfiguracoesSistema,
    /supabase\.storage/,
    "Configurações deve preservar as operações administrativas de Storage."
);
assert.match(
    codigoConfiguracoesSistema,
    /supabase[\s\S]*\.from\("dds_registros"\)/,
    "Configurações deve preservar a verificação histórica de DDS antes de excluir uma obra."
);
assert.match(
    codigoConfiguracoesSistema,
    /<ArquivosStorageConfiguracoes/,
    "O módulo interno de arquivos do Storage deve permanecer montado."
);
assert.match(
    codigoConfiguracoesSistema,
    /<ArquivosStorageConfiguracoes[\s\S]*permissaoSistemaUsuario=\{permissaoSistemaAtual\}/,
    "Configurações deve repassar a permissão central ao módulo interno de Storage."
);
assert.match(
    codigoArquivosStorageConfiguracoes,
    /const permissaoSistemaAtual = permissaoSistemaUsuario;/,
    "O módulo de Storage deve consumir a permissão central já validada."
);
assert.doesNotMatch(
    codigoArquivosStorageConfiguracoes,
    /carregarPermissaoSistemaAtualService|setPermissaoSistemaAtual|setMensagemPermissao|async function carregarPermissaoSistema|from "\.\.\/\.\.\/lib\/supabaseClient"/,
    "O módulo de Storage não pode voltar a carregar permissões em uma consulta própria."
);
assert.match(
    codigoArquivosStorageConfiguracoes,
    /obterBloqueioVisualAcaoCriticaSistema[\s\S]*ACOES_CRITICAS_PERMISSAO_SISTEMA\.LIMPAR_ARQUIVOS/,
    "A proteção crítica para limpeza do Storage deve permanecer ativa."
);
assert.match(
    codigoArquivosStorageConfiguracoes,
    /const carregarStorage = async[\s\S]*onListarArquivosStorage/,
    "A listagem do Storage deve permanecer conectada ao callback funcional."
);
assert.match(
    codigoArquivosStorageConfiguracoes,
    /const excluirArquivoStorage = async[\s\S]*onExcluirArquivoStorage/,
    "A exclusão individual do Storage deve permanecer conectada ao callback funcional."
);
assert.match(
    codigoArquivosStorageConfiguracoes,
    /const limparArquivosStorageSemVinculoFiltrados = async[\s\S]*ignorarConfirmacaoIndividual[\s\S]*limpezaEmLote/,
    "A limpeza em lote protegida deve permanecer funcional."
);
assert.match(
    codigoFundoLoginPublicoService,
    /configuracoes\/login\/fundo-login\.jpg/,
    "O fundo global do login deve permanecer no caminho reservado de Configurações."
);
assert.match(
    codigoQrCodeComLogo,
    /configuracoes\/qrcode\/logo-qrcode\.png/,
    "O logo global dos QR Codes deve permanecer no caminho reservado de Configurações."
);
assert.match(
    codigoStorageAuditoriaService,
    /ATIVOS_SISTEMA_STORAGE[\s\S]*logos-empresas:configuracoes\/login\/fundo-login\.jpg[\s\S]*logos-empresas:configuracoes\/qrcode\/logo-qrcode\.png/,
    "O inventário deve registrar os dois ativos globais do sistema."
);
assert.match(
    codigoStorageAuditoriaService,
    /const ativoSistemaStorage = obterAtivoSistemaStorage[\s\S]*const ativoSistema = Boolean\(ativoSistemaStorage\)/,
    "O inventário deve classificar caminhos globais antes de calcular vínculos."
);
assert.match(
    codigoStorageAuditoriaService,
    /if \(ativoSistemaStorage\)[\s\S]*Exclusão bloqueada:[\s\S]*ativo global protegido do sistema/,
    "O serviço deve bloquear independentemente a exclusão de ativos globais."
);
assert.match(
    codigoArquivosStorageConfiguracoes,
    /!arquivo\?\.ativoSistema[\s\S]*!arquivo\?\.protegidoSistema/,
    "A interface não pode oferecer ativos globais para exclusão."
);
assert.match(
    codigoArquivosStorageConfiguracoes,
    /Ativos do sistema[\s\S]*Ver ativos do sistema[\s\S]*Ativo do sistema/,
    "O painel deve exibir resumo, filtro e identificação visual dos ativos globais."
);
assert.match(
    regraTrabalho,
    /PROTECAO PERMANENTE: TELA DE CARREGAMENTO/,
    "A regra permanente da tela de carregamento deve permanecer documentada."
);
const padraoSenhaConfiguracoesLegada = new RegExp(
    [
        ["SENHA", "CONFIGURACOES", "PADRAO"].join("_"),
        "carregarSenhaConfiguracoesSistemaSupabase",
        "validarSenhaConfiguracoesAppService",
    ].join("|")
);
assert.doesNotMatch(
    codigoApp,
    padraoSenhaConfiguracoesLegada,
    "O App nao pode voltar a carregar ou comparar a senha secundaria das Configuracoes."
);
assert.doesNotMatch(
    codigoAppContentRouter,
    /ConfiguracoesBloqueio|configuracoesDesbloqueadas|onValidarSenhaConfiguracoes/,
    "O router nao pode voltar a bloquear Configuracoes com senha no navegador."
);
assert.match(
    codigoApp,
    /localStorage\.removeItem\(CHAVE_SENHA_CONFIGURACOES_LEGADA\)/,
    "O segredo legado deve ser removido do localStorage dos navegadores."
);
assert.match(
    codigoConfiguracoesSistema,
    /ultimoFilhoEhInterativo/,
    "Cabecalhos de Configuracoes devem identificar controles interativos antes de inserir o botao Recolher."
);
assert.match(
    codigoConfiguracoesSistema,
    /!ultimoFilhoEhInterativo/,
    "Botoes e links nao podem ser usados como conteineres para outro botao."
);
assert.match(
    codigoLoginScreen,
    /carregarFundoLoginPublicoService/,
    "A tela de login deve verificar o estado público antes de solicitar arquivos do Storage."
);
assert.match(
    codigoConfiguracoesSistema,
    /carregarFundoLoginPublicoService/,
    "Configurações deve verificar o estado público antes de solicitar arquivos do Storage."
);
assert.match(
    codigoFundoLoginPublicoService,
    /obter_estado_fundo_login_publico/,
    "O serviço deve consultar a RPC mínima de estado do fundo do login."
);
assert.match(
    codigoFundoLoginPublicoService,
    /salvar_ajuste_fundo_login_sistema/,
    "O ajuste do fundo deve ser salvo por RPC administrativa."
);
assert.match(
    codigoFundoLoginPublicoService,
    /restaurar_ajuste_fundo_login_sistema/,
    "O ajuste padrão do fundo deve ser restaurado por RPC administrativa."
);
assert.doesNotMatch(
    codigoFundoLoginPublicoService,
    /fundo-login-config\.json|application\/json|fetch\(configUrl/,
    "O serviço não pode voltar a buscar um JSON no bucket restrito a imagens."
);
assert.match(
    codigoConfiguracoesSistema,
    /salvarAjusteFundoLoginService/,
    "Configurações deve salvar o pré-ajuste do fundo no banco."
);
assert.match(
    codigoConfiguracoesSistema,
    /restaurarAjusteFundoLoginService/,
    "Configurações deve restaurar o pré-ajuste do fundo no banco."
);
assert.doesNotMatch(
    codigoConfiguracoesSistema,
    /CAMINHO_CONFIG_FUNDO_LOGIN_CONFIGURACOES|configuracaoBlob|contentType:\s*"application\/json"/,
    "Configurações não pode voltar a enviar JSON para o bucket de imagens."
);
assert.match(
    codigoSupabaseClient,
    /export function erroSessaoSupabaseInvalida/,
    "O cliente Supabase deve reconhecer refresh token inválido."
);
assert.match(
    codigoSupabaseClient,
    /export function limparSessaoSupabaseLocalInvalida/,
    "O cliente Supabase deve remover a sessão inválida do projeto atual."
);
assert.match(
    codigoApp,
    /erroSessaoSupabaseInvalida\(error\)[\s\S]*limparSessaoSupabaseLocalInvalida\(\)[\s\S]*window\.location\.reload\(\)/,
    "O App deve recuperar automaticamente uma sessão Supabase inválida."
);
assert.match(
    codigoApp,
    /finally\s*\{[\s\S]*setCarregandoSessao\(false\)/,
    "Falhas na sessão não podem deixar o carregamento inicial travado."
);
assert.doesNotMatch(
    codigoLoginScreen,
    /montarUrlFundoLoginPersonalizado|montarUrlConfigFundoLoginPersonalizado/,
    "A tela de login não pode voltar a montar URLs de arquivos opcionais sem verificar existência."
);
assert.match(
    migracaoFundoLoginPublico,
    /security definer/,
    "A RPC deve consultar os metadados fixos do Storage com privilégios controlados."
);
assert.match(
    migracaoFundoLoginPublico,
    /revoke all[\s\S]*from public/,
    "A RPC deve revogar a permissão implícita de PUBLIC."
);
assert.match(
    migracaoFundoLoginPublico,
    /grant execute[\s\S]*to anon, authenticated, service_role/,
    "A RPC deve conceder apenas execução explícita aos papéis necessários."
);
assert.equal(
    migracaoFundoLoginConfiguracaoBanco,
    roteiroFundoLoginConfiguracaoBanco,
    "A migration e o roteiro revisável do fundo do login devem permanecer idênticos."
);
assert.match(
    migracaoFundoLoginConfiguracaoBanco,
    /create table if not exists public\.configuracoes_publicas_sistema/,
    "O ajuste público deve usar uma tabela dedicada no banco."
);
assert.match(
    migracaoFundoLoginConfiguracaoBanco,
    /alter table public\.configuracoes_publicas_sistema enable row level security/,
    "A tabela do ajuste público deve manter RLS habilitada."
);
assert.match(
    migracaoFundoLoginConfiguracaoBanco,
    /revoke all on table public\.configuracoes_publicas_sistema from anon, authenticated/,
    "Anon e authenticated não podem acessar diretamente a tabela do ajuste."
);
assert.match(
    migracaoFundoLoginConfiguracaoBanco,
    /'ajuste',[\s\S]*configuracao\.valor/,
    "A RPC pública deve devolver o ajuste visual armazenado no banco."
);
assert.match(
    migracaoFundoLoginConfiguracaoBanco,
    /salvar_ajuste_fundo_login_sistema[\s\S]*usuario_permissao_sistema_atual/,
    "A RPC de salvamento deve validar a permissão central do usuário."
);
assert.match(
    migracaoFundoLoginConfiguracaoBanco,
    /grant execute on function public\.salvar_ajuste_fundo_login_sistema\(text, text, numeric\)[\s\S]*to authenticated, service_role/,
    "Somente usuários autenticados e service role podem executar a gravação do ajuste."
);
assert.equal(
    migracaoFundoLoginRestricaoAnon,
    roteiroFundoLoginRestricaoAnon,
    "A migration complementar e o roteiro revisável devem permanecer idênticos."
);
assert.match(
    migracaoFundoLoginRestricaoAnon,
    /revoke execute on function public\.salvar_ajuste_fundo_login_sistema\(text, text, numeric\)[\s\S]*from anon/,
    "Anon não pode executar a RPC de salvamento do ajuste."
);
assert.match(
    migracaoFundoLoginRestricaoAnon,
    /revoke execute on function public\.restaurar_ajuste_fundo_login_sistema\(\)[\s\S]*from anon/,
    "Anon não pode executar a RPC de restauração do ajuste."
);
assert.match(
    migracaoFundoLoginRestricaoAnon,
    /grant execute on function public\.obter_estado_fundo_login_publico\(\)[\s\S]*to anon, authenticated, service_role/,
    "A leitura pública do estado do fundo deve permanecer disponível."
);
assert.doesNotMatch(
    migracaoFundoLoginRestricaoAnon,
    /grant execute on function public\.(?:salvar|restaurar)_ajuste_fundo_login_sistema[\s\S]*to anon/,
    "As RPCs de escrita não podem voltar a ser concedidas ao papel anon."
);
assert.match(
    codigoAppColaboradoresHandlersService,
    /TAMANHO_LOTE_IDS_CERTIFICADOS = 50/,
    "A consulta de certificados deve limitar cada lote a 50 colaboradores."
);
assert.match(
    codigoAppColaboradoresHandlersService,
    /dividirIdsCertificadosEmLotes/,
    "O carregamento de certificados deve dividir listas extensas de colaboradores."
);
assert.match(
    codigoAppColaboradoresHandlersService,
    /\.select\(\s*CAMPOS_CERTIFICADOS_CARREGAMENTO\s*\)/,
    "A consulta de certificados deve selecionar apenas os campos utilizados."
);
assert.doesNotMatch(
    codigoAppColaboradoresHandlersService,
    /\.from\("certificados"\)\s*\.select\("\*"\)\s*\.in\("colaborador_id", idsColaboradores\)/,
    "A consulta única com select estrela e todos os IDs não pode retornar."
);

function criarArmazenamentoLocalSimulado() {
    const dados = new Map();
    return {
        clear: () => dados.clear(),
        getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
        removeItem: (chave) => dados.delete(chave),
        setItem: (chave, valor) => dados.set(chave, String(valor)),
    };
}

const janelaOriginal = globalThis.window;
const customEventOriginal = globalThis.CustomEvent;
const armazenamentoLocal = criarArmazenamentoLocalSimulado();

globalThis.window = {
    localStorage: armazenamentoLocal,
    dispatchEvent: () => true,
};
globalThis.CustomEvent = globalThis.CustomEvent || class CustomEvent {
    constructor(type) { this.type = type; }
};

try {
    const mapaSalvo = salvarMapaObraLocal({
        obraId: "obra-teste",
        obraNome: "Obra de teste",
        pontos: [{ id: "ponto-01", nome: "Canteiro" }],
        alertas: [{ id: "alerta-01", tipo: "Risco de queda" }],
    });
    const mapaRelido = lerMapaObraLocal("obra-teste");

    assert.equal(mapaSalvo.obraId, "obra-teste");
    assert.equal(mapaRelido.pontos[0]?.nome, "Canteiro");
    assert.equal(mapaRelido.alertas[0]?.id, "alerta-01");
    assert.equal(listarMapasObraLocal().length, 1);

    armazenamentoLocal.clear();
    salvarExtintoresVistoria([
        {
            id: "extintor-teste",
            codigo: "E-7",
            status: "Ativo",
            localizacao: "Canteiro",
        },
    ]);
    const extintoresRelidos = listarExtintoresVistoria();

    assert.equal(extintoresRelidos.length, 1);
    assert.equal(extintoresRelidos[0].codigo, "E-07");
    assert.equal(extintoresRelidos[0].localizacao, "Canteiro");
} finally {
    if (janelaOriginal === undefined) delete globalThis.window;
    else globalThis.window = janelaOriginal;

    if (customEventOriginal === undefined) delete globalThis.CustomEvent;
    else globalThis.CustomEvent = customEventOriginal;
}

console.log("Smoke test aprovado: persistencia, extintores, telas e permissoes criticas.");
