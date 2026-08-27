import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    IDS_TREINAMENTOS_EXCLUSIVAMENTE_MANUAIS,
    matrizTreinamentosPorFuncao,
    treinamentoExclusivamenteManual,
    treinamentosBase,
} from "../src/constants/treinamentosConstants.js";
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
import {
    compararFuncaoAsoComCadastro,
    extrairFuncaoAsoDocumento,
    normalizarFuncaoAso,
} from "../src/services/asoFuncaoService.js";

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

assert.equal(
    normalizarFuncaoAso("ADM. DE OBRA"),
    "administrativo de obra",
    "ADM de obra deve ser normalizado."
);

const funcaoAsoExtraida = extrairFuncaoAsoDocumento({
    tipoDocumento: "ASO - Atestado de Saúde Ocupacional",
    texto: [
        "ATESTADO DE SAÚDE OCUPACIONAL",
        "Colaborador: João da Silva",
        "Função: ADM. DE OBRA",
        "Setor: Canteiro",
    ].join("\n"),
});

assert.equal(funcaoAsoExtraida.aplicavel, true);
assert.equal(funcaoAsoExtraida.localizado, true);
assert.equal(
    funcaoAsoExtraida.funcaoNormalizada,
    "administrativo de obra"
);
assert.equal(funcaoAsoExtraida.confianca, "alta");

const funcaoAsoLinhaSeguinte = extrairFuncaoAsoDocumento({
    tipoDocumento: "ASO",
    linhasOcr: [
        { texto: "Função:", yCentro: 10, x0: 10 },
        { texto: "Administrativo de Obra", yCentro: 20, x0: 10 },
        { texto: "Setor: Canteiro", yCentro: 30, x0: 10 },
    ],
});

assert.equal(funcaoAsoLinhaSeguinte.localizado, true);
assert.equal(
    funcaoAsoLinhaSeguinte.funcaoNormalizada,
    "administrativo de obra"
);
assert.equal(funcaoAsoLinhaSeguinte.confianca, "media");

const funcaoAsoSemSeparador = extrairFuncaoAsoDocumento({
    tipoDocumento: "NR-07 ASO - Atestado de Saúde Ocupacional",
    texto: [
        "ATESTADO DE SAÚDE OCUPACIONAL",
        "Funcionário ALAN JOSE RIBEIRO DOS SANTOS",
        "Setor GHE 10",
        "Função AJUDANTE / GERAL Resultado ( X ) APTO",
        "Tipo de atendimento ADMISSIONAL",
    ].join("\n"),
});

assert.equal(
    funcaoAsoSemSeparador.localizado,
    true,
    "ASO escaneado sem dois-pontos deve localizar AJUDANTE / GERAL."
);

assert.equal(
    funcaoAsoSemSeparador.funcaoOriginal,
    "AJUDANTE / GERAL"
);

assert.equal(
    funcaoAsoSemSeparador.funcaoNormalizada,
    "ajudante geral"
);

assert.equal(
    funcaoAsoSemSeparador.origem,
    "texto_campo_sem_separador"
);

const funcaoAsoLinhaSemSeparador = extrairFuncaoAsoDocumento({
    tipoDocumento: "ASO",
    linhasOcr: [
        {
            texto: "Função AJUDANTE / GERAL",
            yCentro: 10,
            x0: 10,
        },
        {
            texto: "Resultado ( X ) APTO",
            yCentro: 20,
            x0: 10,
        },
    ],
});

assert.equal(
    funcaoAsoLinhaSemSeparador.localizado,
    true
);

assert.equal(
    funcaoAsoLinhaSemSeparador.funcaoNormalizada,
    "ajudante geral"
);

const matrizesFuncaoAsoSmoke = [
    {
        chave: "ajudante",
        rotulo: "AJUDANTE GERAL",
        termos: [
            "ajudante geral",
            "ajudante",
        ],
    },
    {
        chave: "pedreiro",
        rotulo: "PEDREIRO",
        termos: [
            "pedreiro",
        ],
    },
    {
        chave: "administrativo",
        rotulo: "ADMINISTRATIVO DE OBRA",
        termos: [
            "administrativo de obra",
        ],
    },
    {
        chave: "apontador",
        rotulo: "APONTADOR",
        termos: [
            "apontador",
        ],
    },
];

const comparacaoAlanAsoSemCatalogo = compararFuncaoAsoComCadastro({
    tipoDocumento: "ASO",
    funcaoDocumento:
        funcaoAsoSemSeparador.funcaoOriginal,
    funcaoDocumentoNormalizada:
        funcaoAsoSemSeparador.funcaoNormalizada,
    funcaoDocumentoConfianca:
        funcaoAsoSemSeparador.confianca,
    funcaoDocumentoOrigem:
        funcaoAsoSemSeparador.origem,
    funcaoCadastro: "PEDREIRO",
});

assert.equal(
    comparacaoAlanAsoSemCatalogo.status,
    "funcao_aso_revisao_manual"
);

assert.equal(
    comparacaoAlanAsoSemCatalogo.requerRevisaoManual,
    true
);

assert.equal(
    comparacaoAlanAsoSemCatalogo.bloqueiaAtualizacao,
    true
);

const comparacaoAlanAso = compararFuncaoAsoComCadastro({
    tipoDocumento: "ASO",
    funcaoDocumento:
        funcaoAsoSemSeparador.funcaoOriginal,
    funcaoDocumentoNormalizada:
        funcaoAsoSemSeparador.funcaoNormalizada,
    funcaoDocumentoConfianca:
        funcaoAsoSemSeparador.confianca,
    funcaoDocumentoOrigem:
        funcaoAsoSemSeparador.origem,
    funcaoCadastro: "PEDREIRO",
    matrizesFuncao: matrizesFuncaoAsoSmoke,
});

assert.equal(
    comparacaoAlanAso.status,
    "divergente"
);

assert.equal(
    comparacaoAlanAso.requerConfirmacao,
    true
);

const comparacaoAsoDivergente = compararFuncaoAsoComCadastro({
    tipoDocumento: "ASO",
    funcaoDocumento: "ADM. DE OBRA",
    funcaoCadastro: "Apontador",
    matrizesFuncao: matrizesFuncaoAsoSmoke,
});

assert.equal(comparacaoAsoDivergente.status, "divergente");
assert.equal(comparacaoAsoDivergente.divergencia, true);
assert.equal(
    comparacaoAsoDivergente.requerConfirmacao,
    true
);

const comparacaoAsoEquivalente = compararFuncaoAsoComCadastro({
    tipoDocumento: "ASO",
    funcaoDocumento: "ADM. DE OBRA",
    funcaoCadastro: "Administrativo de Obra",
});

assert.equal(comparacaoAsoEquivalente.status, "equivalente");
assert.equal(comparacaoAsoEquivalente.equivalente, true);
assert.equal(
    comparacaoAsoEquivalente.requerConfirmacao,
    false
);

const documentoNaoAso = extrairFuncaoAsoDocumento({
    tipoDocumento: "NR-06 - Ficha de EPI",
    texto: "Função: Administrativo de Obra",
});

assert.equal(documentoNaoAso.aplicavel, false);
assert.equal(documentoNaoAso.localizado, false);

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
const codigoEmergenciaQrPinCard = readFileSync(
    new URL("../src/components/configuracoes/EmergenciaQrPinCard.jsx", import.meta.url),
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
const codigoRelatorioDashboardSstService = readFileSync(
    new URL("../src/services/exportacao/relatorioDashboardSstService.js", import.meta.url),
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
const codigoModalRevisaoColaborador = readFileSync(
    new URL("../src/components/colaboradores/ModalRevisaoColaborador.jsx", import.meta.url),
    "utf8"
);
const codigoModalNovaFuncaoColaborador = readFileSync(
    new URL("../src/components/colaboradores/ModalNovaFuncaoColaborador.jsx", import.meta.url),
    "utf8"
);
const codigoColaboradorIdentificacoesSeguranca = readFileSync(
    new URL("../src/components/colaboradores/ColaboradorIdentificacoesSeguranca.jsx", import.meta.url),
    "utf8"
);
const codigoConsultaQrInterna = readFileSync(
    new URL("../src/components/qr/ConsultaQR.jsx", import.meta.url),
    "utf8"
);
const codigoConsultaQrPublica = readFileSync(
    new URL("../src/components/qr/ConsultaQRPublica.jsx", import.meta.url),
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
const codigoDdsRegistrosService = readFileSync(
    new URL("../src/services/ddsRegistrosService.js", import.meta.url),
    "utf8"
);
const codigoUrlPublicaUtils = readFileSync(
    new URL("../src/utils/urlPublicaUtils.js", import.meta.url),
    "utf8"
);
const codigoAuditoriaPublicaConstants = readFileSync(
    new URL("../src/constants/auditoriaPublicaConstants.js", import.meta.url),
    "utf8"
);
const codigoExtintoresVistoriaService = readFileSync(
    new URL("../src/services/extintoresVistoriaService.js", import.meta.url),
    "utf8"
);
const codigoAmbientesControleTabela = readFileSync(
    new URL("../src/components/mapa/AmbientesControleTabela.jsx", import.meta.url),
    "utf8"
);
const codigoDdsPage = readFileSync(
    new URL("../src/components/dds/DdsPage.jsx", import.meta.url),
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
const migracaoFundoLoginRestricaoAnon = readFileSync(
    new URL("../supabase/migrations/20260717202931_restringir_rpcs_fundo_login_anon.sql", import.meta.url),
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
    /carregarPermissaoSistemaAtualService|setPermissaoSistemaAtual|setMensagemPermissaoSistema/,
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
    codigoTreinamentosPage,
    /const \[filtroEmpresaCertificados, setFiltroEmpresaCertificados\] = useState\("Todas"\)/,
    "A Base de Certificados deve manter o filtro por empresa."
);

assert.match(
    codigoTreinamentosPage,
    /const empresasFiltroCertificados = useMemo\(\(\) => \{[\s\S]*obterChaveEmpresaFiltroCertificados\(colaborador\)[\s\S]*empresaA\.titulo[\s\S]*\.localeCompare/,
    "As empresas do filtro devem ser derivadas dos colaboradores."
);

assert.equal(
    (codigoTreinamentosPage.match(/const bateEmpresa =/g) || []).length,
    2,
    "O filtro por empresa deve atuar em certificados e documentos faltantes."
);

assert.match(
    codigoTreinamentosPage,
    /aria-label="Filtrar certificados por empresa"/,
    "O seletor de empresas deve permanecer acessível."
);

assert.match(
    codigoTreinamentosPage,
    /<option value="Todas">Todas as empresas<\/option>[\s\S]*empresasFiltroCertificados\.map/,
    "O seletor deve listar todas as empresas disponíveis."
);

assert.match(
    codigoBaseCertificadosTreinamentos,
    /Função: \{colaborador\.funcao \|\| colaborador\.cargo \|\| "Não informada"\}/,
    "O cartão da Base deve exibir a função do colaborador."
);

assert.match(
    codigoBaseCertificadosTreinamentos,
    /const totalPendentesFiltradosBase = React\.useMemo[\s\S]*\{totalPendentesFiltradosBase\} pendente\(s\)/,
    "A contagem de pendências deve respeitar os filtros ativos."
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
    /const documentosFuncionariosVencidos = itensDocumentaisMonitorados\.filter[\s\S]*item\.status\.chave === "vencido"/,
    "O Dashboard deve separar documentos vencidos de funcionários."
);
assert.match(
    codigoDashboardResumoService,
    /const documentosFuncionariosAVencer30Dias = itensDocumentaisMonitorados\.filter[\s\S]*dias >= 0 && dias <= 30/,
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
    codigoDashboard,
    /colaboradoresMobilizados[\s\S]*Liberados ou com pendência não bloqueante/,
    "O card Mobilizados deve representar liberados e pendências não bloqueantes."
);
assert.match(
    codigoDashboard,
    /aniversariantesMes\.length > 0 \? `\$\{aniversariantesMes\.length\} no mês atual` : "Nenhum no mês atual"/,
    "O detalhe de aniversariantes deve acompanhar o total real do mês."
);
assert.match(
    codigoDashboard,
    /aniversariantesMes: item\.detalhe/,
    "O card compacto de aniversariantes deve usar o detalhe dinâmico."
);
assert.doesNotMatch(
    codigoDashboard,
    /aniversariantesMes: "Nenhum no mês"/,
    "O card de aniversariantes não pode voltar ao texto fixo incorreto."
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
    /horasTrabalhadasMes[\s\S]*Total de horas trabalhadas no mês[\s\S]*horasDdsMes\.carregando[\s\S]*horasDdsMes\.totalHorasFormatado[\s\S]*dia\(s\) validado\(s\) no DDS/,
    "O card de horas trabalhadas deve usar o total mensal validado pelas conferências DDS."
);

assert.match(
    codigoUrlPublicaUtils,
    /https:\/\/www\.safescanbrasil\.com\.br/,
    "Os QR públicos devem possuir o domínio oficial como origem segura."
);
assert.match(
    codigoUrlPublicaUtils,
    /host === "localhost"[\s\S]*host === "127\.0\.0\.1"[\s\S]*host === "::1"/,
    "Os QR públicos devem bloquear origens locais de desenvolvimento."
);
assert.match(
    codigoDdsRegistrosService,
    /export function montarUrlConferenciaDds[\s\S]*obterOrigemPublicaSistema/,
    "A montagem da URL do QR do DDS deve passar pela normalização da origem pública."
);
assert.match(
    codigoAuditoriaPublicaConstants,
    /montarUrlConsultaQrColaboradorPublica[\s\S]*obterOrigemPublicaSistema[\s\S]*montarLinkAuditoriaPublicaSistema[\s\S]*obterOrigemPublicaSistema/,
    "Colaboradores e auditorias devem usar a origem pública protegida."
);
assert.match(
    codigoExtintoresVistoriaService,
    /gerarUrlQrExtintor[\s\S]*montarUrlPublicaSistema/,
    "O QR de extintores deve usar a origem pública protegida."
);
assert.match(
    codigoAmbientesControleTabela,
    /function urlQr[\s\S]*montarUrlPublicaSistema[\s\S]*const urlPonto = montarUrlPublicaSistema/,
    "Os QR de pontos e ambientes do mapa devem usar a origem pública protegida."
);
assert.match(
    codigoDdsPage,
    /qrConferenciaUrl:\s*registroDdsConferencia\?\.tokenPublico[\s\S]*montarUrlConferenciaDds\(\{ token: registroDdsConferencia\.tokenPublico \}\)/,
    "A impressão do DDS deve reconstruir o QR pelo token no momento da renderização."
);
assert.match(
    codigoDashboardService,
    /horasTrabalhadasMes: true[\s\S]*horasTrabalhadasMes: "padrao"[\s\S]*"horasTrabalhadasMes"/,
    "O card futuro de horas trabalhadas deve permanecer personalizável."
);
assert.deepEqual(
    IDS_TREINAMENTOS_EXCLUSIVAMENTE_MANUAIS,
    [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35],
    "Os IDs de CIPA, NR-20 e Brigadista devem permanecer reservados à atribuição manual."
);

const treinamentosManuais = treinamentosBase.filter((treinamento) =>
    treinamentoExclusivamenteManual(treinamento)
);
assert.equal(treinamentosManuais.length, 13);
assert.equal(new Set(treinamentosBase.map((treinamento) => treinamento.id)).size, treinamentosBase.length);
assert.ok(treinamentosManuais.every((treinamento) => treinamento.atribuicao === "manual"));

const idsMatrizesFixas = matrizTreinamentosPorFuncao.flatMap((matriz) => matriz.treinamentos || []);
IDS_TREINAMENTOS_EXCLUSIVAMENTE_MANUAIS.forEach((id) => {
    assert.equal(
        idsMatrizesFixas.includes(id),
        false,
        `Treinamento manual ${id} não pode entrar em matriz fixa de função.`
    );
});
assert.equal(
    matrizTreinamentosPorFuncao.some((matriz) => matriz.chave === "brigada-incendio"),
    false,
    "A função Brigada não pode ser inferida automaticamente pelo cargo."
);

assert.match(
    codigoModalRevisaoColaborador,
    /treinamentoExclusivamenteManual[\s\S]*CIPA, NR-20 e Brigadista são exigências individuais[\s\S]*inclusão manual/,
    "O cadastro individual deve identificar e permitir a inclusão manual."
);
assert.match(
    codigoModalNovaFuncaoColaborador,
    /treinamentosDisponiveisMatriz = treinamentosBase\.filter[\s\S]*!treinamentoExclusivamenteManual[\s\S]*não podem compor matriz de função/,
    "Funções personalizadas não podem oferecer CIPA, NR-20 ou Brigadista."
);
assert.match(
    codigoModalNovaFuncaoColaborador,
    /if \(treinamentoExclusivamenteManual\(treinamentoId\)\) return;/,
    "O bloqueio de treinamentos manuais na matriz deve existir também no manipulador."
);
assert.match(
    codigoColaboradorIdentificacoesSeguranca,
    /obterIdentificacoesSegurancaColaborador[\s\S]*Membro CIPA[\s\S]*Brigadista[\s\S]*data-colaborador-identificacao/,
    "O componente compartilhado deve renderizar as duas identificações."
);
assert.match(
    codigoColaboradoresPage,
    /ColaboradorIdentificacoesSeguranca[\s\S]*colaborador=\{c\}[\s\S]*avaliacao=\{avaliacao\}[\s\S]*className="mt-2"/,
    "O cartão de colaboradores deve exibir as identificações junto aos dados."
);
assert.doesNotMatch(
    codigoColaboradoresPage,
    /pointer-events-none absolute inset-0|absolute -bottom-1|foto-wrap relative h-20 w-20/,
    "A foto do colaborador deve permanecer limpa, sem ícones sobrepostos."
);
assert.match(
    codigoConsultaQrInterna,
    /ColaboradorIdentificacoesSeguranca[\s\S]*colaborador=\{colaboradorAtual\}[\s\S]*treinamentos=\{treinamentos\}/,
    "A Consulta QR interna deve exibir CIPA e Brigadista."
);
assert.match(
    codigoConsultaQrPublica,
    /ColaboradorIdentificacoesSeguranca[\s\S]*colaborador=\{colaborador\}[\s\S]*treinamentos=\{treinamentos\}[\s\S]*justify-center/,
    "A Consulta QR pública deve exibir CIPA e Brigadista."
);
assert.doesNotMatch(
    codigoColaboradoresPage,
    /funcao[\s\S]{0,120}Membro CIPA|funcao[\s\S]{0,120}Brigadista/,
    "As identificações não podem ser inferidas apenas pelo texto da função."
);
assert.match(
    codigoColaboradorDocumentosService,
    /if \(contem\("cipa"[\s\S]*obterTreinamento\(23\)[\s\S]*brigadista[\s\S]*obterTreinamento\(35\)/,
    "CIPA e Brigadista devem possuir identificação controlada por nome."
);
assert.match(
    codigoColaboradorDocumentosService,
    /if \(ehNr20\) \{[\s\S]*contem\("iniciacao", "iniciação"\)[\s\S]*contem\("avancado ii", "avançado ii"\)[\s\S]*contem\("especifico", "específico"\)[\s\S]*contem\("intermediario", "intermediário"\)[\s\S]*contem\("basico", "básico"\)/,
    "NR-20 deve manter identificação controlada por nível e modalidade."
);
assert.match(
    codigoColaboradorDocumentosService,
    /if \(ehNr20\) \{[\s\S]*return null;\s*\}\s*if \(contem\("aso"/,
    "NR-20 genérica deve exigir conferência manual quando o nível não estiver claro."
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
    /const concluidosCalculados = itensObrigatoriosMatriz\.filter\(\(item\) => \["emdia", "semvalidade", "vencendo"\]\.includes\(item\.status\.chave\)\)/,
    "A vencer deve integrar os treinamentos concluídos enquanto estiver válido."
);

assert.match(
    codigoColaboradorDocumentosService,
    /const emDiaCalculados = itensObrigatoriosMatriz\.filter\(\(item\) => \["emdia", "semvalidade"\]\.includes\(item\.status\.chave\)\)/,
    "O contador exclusivo Em dia não deve incorporar itens a vencer."
);

assert.match(
    codigoColaboradorDocumentosService,
    /const concluidos = foraControleOperacional \? \[\] : concluidosCalculados/,
    "Colaboradores históricos devem ter o indicador concluídos zerado."
);

assert.match(
    codigoColaboradoresPage,
    /const percentualTreinamentos = avaliacao\.total > 0 \? Math\.round\(\(avaliacao\.concluidos\.length \/ avaliacao\.total\) \* 100\) : 100/,
    "O percentual deve considerar todos os treinamentos válidos concluídos."
);

assert.match(
    codigoColaboradoresPage,
    /const treinamentosEmDia = avaliacao\.emDia\.length/,
    "O contador Em dia deve continuar exclusivo."
);

assert.match(
    codigoColaboradoresPage,
    /const treinamentosPendentes = avaliacao\.pendentes\.length/,
    "O contador Pendentes não deve incorporar itens a vencer."
);

assert.match(
    codigoColaboradoresPage,
    /\.filter\(\(item\) => \["pendente", "vencido"\]\.includes\(item\.status\.chave\)\)/,
    "O relatório de pendências deve considerar somente ausentes e vencidos."
);

assert.doesNotMatch(
    codigoColaboradoresPage,
    /\.filter\(\(item\) => \["pendente", "vencido", "vencendo"\]\.includes\(item\.status\.chave\)\)/,
    "Itens a vencer não podem voltar ao relatório de pendências."
);

assert.match(
    codigoDashboardResumoService,
    /const concluidos = itens\.filter\(\(item\) => \["emdia", "semvalidade", "vencendo"\]\.includes\(item\.status\.chave\)\)\.length/,
    "O Dashboard deve incluir documentos válidos a vencer no total concluído."
);

assert.match(
    codigoDashboardResumoService,
    /const pendencias = itensDocumentaisMonitorados\.filter\([\s\S]*\["pendente", "vencido"\]/,
    "O Dashboard deve separar pendências reais dos alertas preventivos."
);

assert.match(
    codigoRelatorioDashboardSstService,
    /const totalConcluidos = numeroSeguroRelatorioDashboard\(indicadores\.concluidos \?\? indicadores\.emDia\)/,
    "O relatório deve calcular conformidade usando o total concluído."
);

assert.ok(
    codigoRelatorioDashboardSstService.includes(
        "${escaparHTML(percentualConformidade)}% concluídos"
    ),
    "O relatório deve identificar o percentual como concluído."
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
assert.match(
    codigoConfiguracoesSistema,
    /CHAVES_BLOCOS_CONFIGURACOES_PADRAO[\s\S]*config-emergencia-qr[\s\S]*CHAVES_BLOCOS_CONFIGURACOES_CRITICOS[\s\S]*config-emergencia-qr/,
    "O PIN de emergência deve participar do painel e do filtro de configurações críticas."
);
assert.match(
    codigoConfiguracoesSistema,
    /chave: "config-emergencia-qr"[\s\S]*Senha\/PIN de emergência QR[\s\S]*case "config-emergencia-qr"[\s\S]*<EmergenciaQrPinCard/,
    "O card de emergência deve possuir metadados e renderização dentro da grade."
);
assert.match(
    codigoConfiguracoesSistema,
    /<EmergenciaQrPinCard[\s\S]*controleCard=\{botaoRecolherBlocoConfiguracao/,
    "O card de emergência deve usar o controle padrão de recolhimento de Configurações."
);
assert.doesNotMatch(
    codigoAppContentRouter,
    /<EmergenciaQrPinCard|page-shell space-y-4[\s\S]*<ConfiguracoesSistema/,
    "O roteador não pode manter o PIN solto abaixo da grade de Configurações."
);
assert.doesNotMatch(
    codigoEmergenciaQrPinCard,
    /CHAVE_STORAGE_RECOLHIDO_EMERGENCIA_QR|setRecolhido|botaoControleCardEmergenciaQr/,
    "O card PIN não pode manter um segundo estado de recolhimento."
);
assert.match(
    codigoEmergenciaQrPinCard,
    /controleCard[\s\S]*definir_senha_emergencia_empresa[\s\S]*Protegido por RPC/,
    "O card PIN deve preservar a RPC e receber o controle visual do painel."
);
assert.match(
    codigoConfiguracoesSistema,
    /<EmergenciaQrPinCard[\s\S]*onAlternarRecolhido=\{\(\) =>[\s\S]*alternarRecolhidoBlocoConfiguracao[\s\S]*config-emergencia-qr/,
    "Configurações deve entregar ao PIN a ação exclusiva do cabeçalho."
);
assert.match(
    codigoEmergenciaQrPinCard,
    /onAlternarRecolhido = null[\s\S]*<button[\s\S]*type="button"[\s\S]*onClick=\{\(\) => onAlternarRecolhido\?\.\(\)\}[\s\S]*aria-label="Recolher Senha\/PIN do contato de emergência"[\s\S]*Senha\/PIN do contato de emergência/,
    "Título e descrição do PIN devem formar o controle clicável do cabeçalho."
);
assert.doesNotMatch(
    codigoEmergenciaQrPinCard,
    /<div className="h-full"[^>]*onClick=|<Card[^>]*onClick=|mt-5 grid[^>]*onClick=/,
    "A raiz, o Card e o corpo do PIN não podem alternar o recolhimento."
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

/*
 * FUNCAO_BASE_SERVICO_PURO_VALIDADA
 *
 * O teste importa apenas o serviço puro. Ele não importa o serviço
 * principal do Vite e, portanto, não depende da resolução de imports
 * sem extensão feita pelo bundler.
 */
const {
    resolverFuncaoBasePorMatrizes:
        resolverFuncaoBasePorMatrizesSmoke,
} = await import(
    "../src/services/funcaoBaseService.js"
);

const matrizesFuncaoBaseSmoke = [
    {
        chave: "ajudante",
        rotulo: "AJUDANTE",
        termos: [
            "ajudante",
            "servente",
            "auxiliar",
        ],
        treinamentos: [1, 2],
    },
    {
        chave: "geral",
        rotulo: "GERAL",
        termos: [],
        treinamentos: [1],
    },
];

const funcaoAjudanteGeralSmoke =
    resolverFuncaoBasePorMatrizesSmoke({
        funcao: "AJUDANTE GERAL",
        matrizes:
            matrizesFuncaoBaseSmoke,
    });

assert.equal(
    funcaoAjudanteGeralSmoke.localizada,
    true,
    "AJUDANTE GERAL deve localizar uma função-base."
);

assert.equal(
    funcaoAjudanteGeralSmoke.funcaoBase,
    "AJUDANTE",
    "AJUDANTE GERAL deve ser agrupado em AJUDANTE."
);

assert.equal(
    funcaoAjudanteGeralSmoke.chaveFuncaoBase,
    "ajudante"
);

const funcaoServenteSmoke =
    resolverFuncaoBasePorMatrizesSmoke({
        funcao: "SERVENTE",
        matrizes:
            matrizesFuncaoBaseSmoke,
    });

assert.equal(
    funcaoServenteSmoke.funcaoBase,
    "AJUDANTE",
    "SERVENTE deve usar a matriz AJUDANTE."
);

const funcaoDesconhecidaSmoke =
    resolverFuncaoBasePorMatrizesSmoke({
        funcao:
            "MONTADOR DE PAINEL SOLAR",
        matrizes:
            matrizesFuncaoBaseSmoke,
    });

assert.equal(
    funcaoDesconhecidaSmoke.localizada,
    false,
    "Função desconhecida não deve ser descartada."
);

assert.equal(
    funcaoDesconhecidaSmoke.funcaoBase,
    "MONTADOR DE PAINEL SOLAR",
    "Função desconhecida deve permanecer visível com o nome original."
);

const codigoColaboradorFuncaoBaseSmoke =
    readFileSync(
        new URL(
            "../src/services/colaboradorDocumentosService.js",
            import.meta.url
        ),
        "utf8"
    );

assert.match(
    codigoColaboradorFuncaoBaseSmoke,
    /resolverFuncaoBasePorMatrizes/,
    "Serviço documental deve usar o serviço puro de função-base."
);

assert.match(
    codigoColaboradorFuncaoBaseSmoke,
    /export function obterFuncaoBaseColaborador/,
    "Serviço deve expor a função-base do colaborador."
);

const codigoDashboardFuncaoBaseSmoke =
    readFileSync(
        new URL(
            "../src/services/dashboardResumoService.js",
            import.meta.url
        ),
        "utf8"
    );

assert.match(
    codigoDashboardFuncaoBaseSmoke,
    /obterFuncaoBaseColaborador/,
    "Dashboard deve agrupar colaboradores pela função-base."
);

const codigoComponenteFuncaoBaseSmoke =
    readFileSync(
        new URL(
            "../src/components/dashboard/DashboardColaboradoresFuncao.jsx",
            import.meta.url
        ),
        "utf8"
    );

assert.doesNotMatch(
    codigoComponenteFuncaoBaseSmoke,
    /listaColaboradoresPorFuncao\.slice\(\s*0\s*,\s*8\s*\)/,
    "Dashboard não deve esconder funções depois da oitava posição."
);
/*
 * FUNCOES_TREINAMENTOS_REMOTAS_FUNDACAO
 *
 * Garante a mesclagem segura das matrizes fixas,
 * ajustes remotos e funções personalizadas legadas.
 */
const moduloFuncoesTreinamentosRemotas = await import(
    "../src/services/funcoesTreinamentosService.js"
);

const matrizesBaseFuncoesRemotas = [
    {
        chave: "ajudante",
        rotulo: "AJUDANTE",
        termos: [
            "ajudante",
            "servente",
            "auxiliar",
        ],
        treinamentos: [1, 2],
    },
    {
        chave: "pedreiro",
        rotulo: "PEDREIRO",
        termos: ["pedreiro"],
        treinamentos: [1, 3],
    },
    {
        chave: "geral",
        rotulo: "GERAL",
        termos: [],
        treinamentos: [1],
    },
];

const matrizesMescladasFuncoesRemotas =
    moduloFuncoesTreinamentosRemotas
        .mesclarMatrizesFuncaoRemotas({
            matrizesBase:
                matrizesBaseFuncoesRemotas,
            funcoesRemotas: [
                {
                    chave: "ajudante",
                    rotulo: "AJUDANTE",
                    termos: [
                        "ajudante",
                        "ajudante geral",
                        "servente",
                    ],
                    treinamentos: [1, 2, 7],
                    tipo: "ajuste_fixa",
                    ativa: true,
                },
                {
                    chave:
                        "custom-montador-painel-solar",
                    rotulo:
                        "MONTADOR DE PAINEL SOLAR",
                    termos: [
                        "montador solar",
                        "painel solar",
                    ],
                    treinamentos: [1, 9],
                    tipo: "personalizada",
                    ativa: true,
                },
            ],
            funcoesLocais: [
                {
                    chave:
                        "custom-montador-painel-solar",
                    rotulo:
                        "MONTADOR DE PAINEL SOLAR",
                    termos: ["solar"],
                    treinamentos: [1],
                },
                {
                    chave:
                        "custom-legado-pintor-industrial",
                    rotulo:
                        "PINTOR INDUSTRIAL",
                    termos: ["pintor industrial"],
                    treinamentos: [1, 4],
                },
            ],
        });

const matrizAjudanteRemota =
    matrizesMescladasFuncoesRemotas.find(
        (item) =>
            item.chave === "ajudante"
    );

assert.deepEqual(
    matrizAjudanteRemota.treinamentos,
    [1, 2, 7],
    "Ajuste remoto deve substituir os treinamentos da matriz fixa."
);

assert.equal(
    matrizAjudanteRemota.ajusteRemoto,
    true,
    "Matriz fixa ajustada deve ser identificada como remota."
);

assert.equal(
    matrizesMescladasFuncoesRemotas.filter(
        (item) =>
            item.rotulo ===
            "MONTADOR DE PAINEL SOLAR"
    ).length,
    1,
    "Função remota deve substituir a cópia legada do localStorage."
);

assert.ok(
    matrizesMescladasFuncoesRemotas.some(
        (item) =>
            item.rotulo ===
            "PINTOR INDUSTRIAL"
    ),
    "Função local ainda não migrada deve continuar disponível."
);

assert.equal(
    matrizesMescladasFuncoesRemotas[
        matrizesMescladasFuncoesRemotas.length - 1
    ].chave,
    "geral",
    "A matriz geral deve permanecer como último fallback."
);

const codigoDocumentosFuncoesRemotas =
    readFileSync(
        new URL(
            "../src/services/colaboradorDocumentosService.js",
            import.meta.url
        ),
        "utf8"
    );

assert.match(
    codigoDocumentosFuncoesRemotas,
    /definirFuncoesTreinamentosRemotas/,
    "Serviço documental deve expor o cache remoto."
);

assert.match(
    codigoDocumentosFuncoesRemotas,
    /mesclarMatrizesFuncaoRemotas/,
    "Matrizes devem ser mescladas pelo serviço remoto."
);

const codigoHandlersFuncoesRemotas =
    readFileSync(
        new URL(
            "../src/services/appColaboradoresHandlersService.js",
            import.meta.url
        ),
        "utf8"
    );

assert.match(
    codigoHandlersFuncoesRemotas,
    /carregarFuncoesTreinamentosRemotas/,
    "Carregamento de colaboradores deve buscar funções remotas."
);

const codigoMigracaoFuncoesRemotas =
    readFileSync(
        new URL(
            "../supabase/migrations/20260721101500_funcoes_treinamentos_persistencia_remota.sql",
            import.meta.url
        ),
        "utf8"
    );

assert.match(
    codigoMigracaoFuncoesRemotas,
    /enable row level security/i,
    "Tabela de funções deve possuir RLS."
);

assert.match(
    codigoMigracaoFuncoesRemotas,
    /usuario_tem_permissao_sistema[\s\S]*colaboradores[\s\S]*editar/i,
    "Alterações de funções devem exigir permissão de edição."
);

assert.match(
    codigoMigracaoFuncoesRemotas,
    /usuario_tem_permissao_sistema[\s\S]*colaboradores[\s\S]*excluir/i,
    "Exclusões de funções devem exigir permissão de exclusão."
);

assert.doesNotMatch(
    codigoMigracaoFuncoesRemotas,
    /grant[\s\S]*on table public\.funcoes_treinamentos[\s\S]*to anon/i,
    "Usuários anônimos não podem acessar a tabela de funções."
);
/*
 * AJUSTAR_FUNCOES_INTERFACE_SEGURA
 */
const codigoPaginaAjustarFuncoes =
    readFileSync(
        new URL(
            "../src/components/colaboradores/ColaboradoresPage.jsx",
            import.meta.url
        ),
        "utf8"
    );

assert.match(
    codigoPaginaAjustarFuncoes,
    /Ajustar funções/,
    "A tela de colaboradores deve exibir o botão Ajustar funções."
);

assert.match(
    codigoPaginaAjustarFuncoes,
    /ModalAjustarFuncoesColaborador/,
    "A tela deve renderizar o modal de gerenciamento das funções."
);

assert.match(
    codigoPaginaAjustarFuncoes,
    /salvarFuncaoTreinamentosRemota/,
    "Novas funções devem tentar persistência remota."
);

const codigoModalAjustarFuncoes =
    readFileSync(
        new URL(
            "../src/components/colaboradores/ModalAjustarFuncoesColaborador.jsx",
            import.meta.url
        ),
        "utf8"
    );

assert.match(
    codigoModalAjustarFuncoes,
    /Salvar ajustes/,
    "O modal deve permitir salvar palavras-chave e treinamentos."
);

assert.match(
    codigoModalAjustarFuncoes,
    /Excluir função/,
    "O modal deve permitir excluir funções personalizadas."
);

assert.match(
    codigoModalAjustarFuncoes,
    /Restaurar padrão/,
    "Funções fixas devem permitir restauração da matriz padrão."
);

assert.match(
    codigoModalAjustarFuncoes,
    /colaboradoresVinculados\s*>\s*0/,
    "A exclusão deve ser bloqueada quando houver colaboradores vinculados."
);

const codigoServicoCrudFuncoes =
    readFileSync(
        new URL(
            "../src/services/funcoesTreinamentosService.js",
            import.meta.url
        ),
        "utf8"
    );

assert.match(
    codigoServicoCrudFuncoes,
    /export async function salvarFuncaoTreinamentosRemota/,
    "O serviço deve salvar funções no Supabase."
);

assert.match(
    codigoServicoCrudFuncoes,
    /export async function excluirFuncaoTreinamentosRemota/,
    "O serviço deve excluir ou restaurar funções."
);

assert.match(
    codigoServicoCrudFuncoes,
    /await import\(\s*["']\.\.\/lib\/supabaseClient\.js["']\s*\)/,
    "O cliente Supabase deve ser carregado dinamicamente."
);

assert.doesNotMatch(
    codigoServicoCrudFuncoes,
    /^import[\s\S]*supabaseClient\.js/m,
    "O serviço não pode importar estaticamente o cliente Supabase."
);
/*
 * MODAIS_FUNCOES_HERO_RODAPE_FIXO
 *
 * Garante o hero padrão SafeScan, o rodapé fixo
 * e a permanência das ações críticas dos modais.
 */
const codigoModalAjustarFuncoesVisual =
    readFileSync(
        new URL(
            "../src/components/colaboradores/ModalAjustarFuncoesColaborador.jsx",
            import.meta.url
        ),
        "utf8"
    );

assert.match(
    codigoModalAjustarFuncoesVisual,
    /dashboard-hero-sst\.webp/,
    "O modal Ajustar funções deve utilizar o hero padrão SafeScan."
);

assert.match(
    codigoModalAjustarFuncoesVisual,
    /linear-gradient\(90deg/,
    "O hero do modal Ajustar funções deve possuir sobreposição escura."
);

assert.match(
    codigoModalAjustarFuncoesVisual,
    /<footer className="shrink-0 border-t/,
    "As ações do modal Ajustar funções devem permanecer em rodapé fixo."
);

assert.match(
    codigoModalAjustarFuncoesVisual,
    /Excluir função/,
    "O botão de exclusão das funções personalizadas deve permanecer disponível."
);

/*
 * EXCLUIR_FUNCAO_ACAO_SEPARADA
 *
 * A exclusão deve permanecer visível, mas bloqueada
 * para funções fixas e funções com colaboradores.
 */
assert.match(
    codigoModalAjustarFuncoesVisual,
    /data-acao="excluir-funcao"/,
    "O rodapé deve possuir uma ação exclusiva para excluir função."
);

assert.match(
    codigoModalAjustarFuncoesVisual,
    /!funcaoSelecionada\.personalizada/,
    "Funções fixas padrão não podem ser excluídas."
);

assert.match(
    codigoModalAjustarFuncoesVisual,
    /!podeExcluir/,
    "Funções com colaboradores vinculados não podem ser excluídas."
);

assert.match(
    codigoModalAjustarFuncoesVisual,
    /data-acao="restaurar-funcao"/,
    "A restauração das funções fixas deve permanecer como ação separada."
);

assert.match(
    codigoModalAjustarFuncoesVisual,
    /Restaurar padrão/,
    "A restauração das funções fixas deve permanecer disponível."
);

assert.match(
    codigoModalAjustarFuncoesVisual,
    /Salvar ajustes/,
    "O botão Salvar ajustes deve permanecer no rodapé."
);

const codigoModalNovaFuncaoVisual =
    readFileSync(
        new URL(
            "../src/components/colaboradores/ModalNovaFuncaoColaborador.jsx",
            import.meta.url
        ),
        "utf8"
    );

assert.match(
    codigoModalNovaFuncaoVisual,
    /dashboard-hero-sst\.webp/,
    "O modal Nova função deve utilizar o hero padrão SafeScan."
);

assert.match(
    codigoModalNovaFuncaoVisual,
    /Gerenciamento de matrizes/,
    "O modal Nova função deve seguir o padrão textual do gerenciamento de matrizes."
);

assert.match(
    codigoModalNovaFuncaoVisual,
    /<footer className="shrink-0 border-t/,
    "O modal Nova função deve possuir rodapé fixo."
);

assert.match(
    codigoModalNovaFuncaoVisual,
    /treinamentosDisponiveisMatriz = treinamentosBase\.filter/,
    "O filtro da matriz deve permanecer compatível com a regressão histórica."
);

assert.match(
    codigoModalNovaFuncaoVisual,
    /if \(treinamentoExclusivamenteManual\(treinamentoId\)\) return;/,
    "O manipulador deve preservar o bloqueio histórico dos treinamentos manuais."
);

assert.match(
    codigoModalNovaFuncaoVisual,
    /Salvar função/,
    "O botão Salvar função deve permanecer disponível."
);
console.log("Smoke test aprovado: persistencia, extintores, telas e permissoes criticas.");
const codigoModalDivergenciaFuncaoAso = readFileSync(
    new URL("../src/components/treinamentos/ModalDivergenciaFuncaoAso.jsx", import.meta.url),
    "utf8"
);

const codigoAppTreinamentosHandlers = readFileSync(
    new URL("../src/services/appTreinamentosHandlersService.js", import.meta.url),
    "utf8"
);

assert.match(
    codigoModalDivergenciaFuncaoAso,
    /Atualizar função e salvar ASO/,
    "Popup de divergencia ASO deve permanecer conectado ao fluxo de upload."
);

assert.match(
    codigoModalDivergenciaFuncaoAso,
    /Cancelar envio/,
    "O popup deve permitir cancelar sem alterar a função."
);

assert.match(
    codigoTreinamentosPage,
    /salvarCertificadoComConferenciaAso/,
    "Envios individual e em lote devem utilizar a conferência do ASO."
);

assert.match(
    codigoTreinamentosPage,
    /decisaoFuncaoAso:\s*"atualizar"/,
    "A confirmação do popup deve enviar a decisão explícita de atualização."
);

assert.match(
    codigoAppTreinamentosHandlers,
    /tipo:\s*"divergencia_funcao_aso"/,
    "O serviço deve devolver uma divergência estruturada antes do salvamento."
);

assert.match(
    codigoAppTreinamentosHandlers,
    /UPDATE_FUNCAO_ASO/,
    "A atualização confirmada deve registrar auditoria."
);

assert.match(
    codigoAppTreinamentosHandlers,
    /\.update\(\{\s*funcao:\s*novaFuncao,/s,
    "A função só deve ser atualizada pelo fluxo confirmado do ASO."
);

assert.match(
    codigoApp,
    /registrarAuditoria,\s*\n\s*\}\);/,
    "App deve encaminhar o registrador de auditoria ao salvamento."
);
const codigoOcrArquivoAsoEscaneado = readFileSync(
    new URL(
        "../src/services/documentosOcrArquivoService.js",
        import.meta.url
    ),
    "utf8"
);

assert.match(
    codigoOcrArquivoAsoEscaneado,
    /numeroPagina === 1 \? 2\.35 : 2\.0/,
    "OCR de ASO escaneado deve manter resolucao ampliada."
);

assert.match(
    codigoOcrArquivoAsoEscaneado,
    /1900\s*\/\s*viewportBase\.width/,
    "OCR de PDF escaneado deve preservar largura adequada."
);

assert.match(
    codigoOcrArquivoAsoEscaneado,
    /2700\s*\/\s*viewportBase\.height/,
    "OCR de PDF escaneado deve preservar altura adequada."
);

assert.match(
    codigoOcrArquivoAsoEscaneado,
    /Math\.max\(\s*1\.65,/s,
    "OCR de PDF escaneado deve preservar escala minima."
);
const codigoOcrAnalisePrioridadeAso = readFileSync(
    new URL(
        "../src/services/documentosOcrAnaliseService.js",
        import.meta.url
    ),
    "utf8"
);

const codigoVerificacaoPrioridadeAso = readFileSync(
    new URL(
        "../src/services/documentosVerificacaoService.js",
        import.meta.url
    ),
    "utf8"
);

const indicePrioridadeTituloAso =
    codigoOcrAnalisePrioridadeAso.indexOf(
        "const possuiTituloAsoExplicito"
    );

const indiceClassificacaoPcmso =
    codigoOcrAnalisePrioridadeAso.indexOf(
        'if (base.includes("programa de controle medico de saude ocupacional")'
    );

assert.ok(
    indicePrioridadeTituloAso >= 0 &&
    indiceClassificacaoPcmso >= 0 &&
    indicePrioridadeTituloAso <
        indiceClassificacaoPcmso,
    "Titulo explicito de ASO deve vencer referencias internas a PCMSO."
);

assert.match(
    codigoOcrAnalisePrioridadeAso,
    /possuiTituloAsoExplicito\s*\|\|\s*arquivoNomeIndicaAso/s,
    "Classificador deve considerar titulo e nome do arquivo antes de PCMSO."
);

assert.match(
    codigoVerificacaoPrioridadeAso,
    /const selecaoIndicaAso = Boolean\(/,
    "Comparacao deve reconhecer a selecao explicita de NR-07 ASO."
);

assert.match(
    codigoVerificacaoPrioridadeAso,
    /selecaoIndicaAso\s*&&\s*funcaoDocumentoNormalizadaFuncaoAso\s*\?\s*tipoDocumentoSelecionadoFuncaoAso/s,
    "Tipo selecionado ASO deve prevalecer quando a funcao foi extraida."
);

assert.match(
    codigoVerificacaoPrioridadeAso,
    /tipoDocumentoDetectado:\s*tipoDocumentoDetectadoFuncaoAso/,
    "Resultado deve registrar o tipo detectado pelo OCR."
);

assert.match(
    codigoVerificacaoPrioridadeAso,
    /tipoDocumentoSelecionado:\s*tipoDocumentoSelecionadoFuncaoAso/,
    "Resultado deve registrar o tipo selecionado pelo usuario."
);

assert.match(
    codigoVerificacaoPrioridadeAso,
    /tipoDocumentoUsado:\s*tipoDocumentoComparacaoFuncaoAso/,
    "Resultado deve registrar o tipo efetivamente usado na comparacao."
);

const comparacaoRegressaoAlanAso = compararFuncaoAsoComCadastro({
    tipoDocumento:
        "NR-07 ASO - Atestado de Saude Ocupacional",
    funcaoDocumento:
        "AJUDANTE GERAL",
    funcaoDocumentoNormalizada:
        "ajudante geral",
    funcaoDocumentoConfianca:
        "alta",
    funcaoDocumentoOrigem:
        "texto_campo_rotulado",
    funcaoCadastro:
        "PEDREIRO",
    matrizesFuncao: matrizesFuncaoAsoSmoke,
});

assert.equal(
    comparacaoRegressaoAlanAso.aplicavel,
    true,
    "NR-07 ASO selecionado deve tornar a comparacao aplicavel."
);

assert.equal(
    comparacaoRegressaoAlanAso.status,
    "divergente",
    "AJUDANTE GERAL e PEDREIRO devem gerar divergencia."
);

assert.equal(
    comparacaoRegressaoAlanAso.requerConfirmacao,
    true,
    "Divergencia do ASO deve exigir confirmacao antes de salvar."
);
