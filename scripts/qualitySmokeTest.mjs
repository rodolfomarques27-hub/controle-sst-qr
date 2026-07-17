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
const codigoLoginScreen = readFileSync(
    new URL("../src/components/LoginScreen.jsx", import.meta.url),
    "utf8"
);
const codigoFundoLoginPublicoService = readFileSync(
    new URL("../src/services/fundoLoginPublicoService.js", import.meta.url),
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
