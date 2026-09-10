import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, isRunnableDevEnvironment } from "vite";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const servicePath = resolve(repoRoot, "src/services/treinamentosRevisaoService.js");
const serviceSource = readFileSync(servicePath, "utf8");
const migrationNovaPath = resolve(repoRoot, "supabase/migrations/20260909132823_20260909131500_treinamentos_revisoes_idempotencia_fingerprint.sql");
const migrationAntigaPath = resolve(repoRoot, "supabase/migrations/20260909131500_treinamentos_revisoes_idempotencia_fingerprint.sql");

assert.match(serviceSource, /verificarCertificadoTreinamento/);
assert.match(serviceSource, /salvarResultado:\s*false/);
assert.match(serviceSource, /\.storage\.from\(bucket\)\.download/);
assert.match(serviceSource, /fonteFingerprint/);
assert.match(serviceSource, /previaFingerprint/);
assert.match(serviceSource, /conclusaoFingerprint/);
assert.match(serviceSource, /Prévia desatualizada/);
assert.match(serviceSource, /CONCLUSOES_EM_ANDAMENTO/);
assert.match(serviceSource, /resumo->>conclusao_fingerprint/);
assert.match(serviceSource, /\.eq\("status",\s*"concluida"\)/);
assert.match(serviceSource, /RECONCILIACAO_MAX_TENTATIVAS\s*=\s*6/);
assert.match(serviceSource, /tentativas_reconciliacao/);
assert.match(serviceSource, /erroReconciliacao/);
assert.equal(existsSync(migrationNovaPath), true, "Migration local deve usar a versão remota como prefixo.");
assert.equal(existsSync(migrationAntigaPath), false, "Migration local antiga sem prefixo remoto não deve permanecer.");
assert.match(serviceSource, /status_temporal_anterior/);
assert.match(serviceSource, /verificacao_reprocessada/);
assert.match(serviceSource, /onProgresso/);
assert.match(serviceSource, /fase:\s*"reprocessamento_evidencias"/);
assert.match(serviceSource, /emitirProgressoReprocessamento/);
assert.match(serviceSource, /listarHistoricoRevisoesTreinamentosService/);
assert.match(serviceSource, /obterHistoricoRevisaoTreinamentosService/);
assert.match(serviceSource, /\.from\("treinamentos_revisao_itens"\)/);
assert.match(serviceSource, /\.from\("treinamentos_revisao_evidencias"\)/);
assert.match(serviceSource, /readOnly:\s*true/);
assert.match(serviceSource, /verificacao_anterior/);
assert.match(serviceSource, /confirmarConclusao\s*!==\s*true/);
assert.doesNotMatch(serviceSource, /\.insert\s*\(/);
assert.doesNotMatch(serviceSource, /\.update\s*\(/);
assert.doesNotMatch(serviceSource, /\.upsert\s*\(/);
assert.doesNotMatch(serviceSource, /\.from\s*\([^)]*\)\s*\.delete\s*\(/);
assert.doesNotMatch(serviceSource, /\.upload\s*\(/);
assert.doesNotMatch(serviceSource, /registrar_pdf_revisao_treinamentos/);

const COLABORADOR_ID = "11111111-1111-4111-8111-111111111111";
const EMPRESA_ID = "22222222-2222-4222-8222-222222222222";
const CERT_SEM_VALIDADE = "33333333-3333-4333-8333-333333333333";
const CERT_ATENCAO = "44444444-4444-4444-8444-444444444444";
const EVID_CERT_1 = "55555555-5555-4555-8555-555555555555";
const EVID_CERT_2 = "66666666-6666-4666-8666-666666666666";
const EVID_LISTA = "77777777-7777-4777-8777-777777777777";
const SHA_1 = "a".repeat(64);
const SHA_2 = "b".repeat(64);
const SHA_LISTA = "c".repeat(64);
const SHA_DIVERGENTE = "d".repeat(64);

function hojeIsoLocal() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function ontemIsoLocal() {
    const agora = new Date();
    agora.setDate(agora.getDate() - 1);
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function datasAtencao() {
    const vencimento = new Date();
    vencimento.setHours(12, 0, 0, 0);
    vencimento.setDate(vencimento.getDate() + 15);
    const vencimentoIso = vencimento.toISOString().slice(0, 10);

    const realizacao = new Date(`${vencimentoIso}T12:00:00`);
    realizacao.setDate(realizacao.getDate() - 730);
    return {
        realizacao: realizacao.toISOString().slice(0, 10),
        vencimento: vencimentoIso,
    };
}

function criarDados() {
    const atencao = datasAtencao();
    return {
        colaboradores: [{
            id: COLABORADOR_ID,
            empresa_id: EMPRESA_ID,
            nome: "COLABORADOR TESTE I2 P2 P2A",
            funcao: "PEDREIRO",
            matricula: "M-001",
            matricula_esocial: "ESOC-001",
            cpf: "11122233344",
            codigo_funcionario: "C001",
            status: "Ativo",
            status_mobilizacao: "Mobilizado",
            treinamentos_removidos: [],
            treinamentos_adicionais: [],
            empresa: {
                id: EMPRESA_ID,
                nome: "EMPRESA TESTE",
                cnpj: "00000000000100",
                numero_contrato: "CT-001",
                tipo_empresa: "contratada",
                empresa_pai_id: null,
                status: "Ativa",
            },
        }],
        certificados: [
            {
                id: CERT_SEM_VALIDADE,
                colaborador_id: COLABORADOR_ID,
                treinamento_id: null,
                treinamento_codigo: 1,
                tipo_treinamento: "Treinamento 1",
                nome_treinamento: "Treinamento 1",
                data_realizacao: "2026-08-01",
                data_vencimento: null,
                arquivo_url: "certificados/sem-validade.pdf",
                arquivo_nome: "sem-validade.pdf",
                status_validacao: "Válido",
                observacao: "",
                created_at: "2026-08-01T10:00:00.000Z",
                updated_at: "2026-08-01T10:00:00.000Z",
            },
            {
                id: CERT_ATENCAO,
                colaborador_id: COLABORADOR_ID,
                treinamento_id: null,
                treinamento_codigo: 3,
                tipo_treinamento: "Treinamento 3",
                nome_treinamento: "Treinamento 3",
                data_realizacao: atencao.realizacao,
                data_vencimento: atencao.vencimento,
                arquivo_url: "certificados/atencao.pdf",
                arquivo_nome: "atencao.pdf",
                status_validacao: "Válido",
                observacao: "",
                created_at: "2026-08-02T10:00:00.000Z",
                updated_at: "2026-08-02T10:00:00.000Z",
            },
        ],
        certificados_evidencias: [
            {
                id: EVID_CERT_1,
                certificado_origem_id: CERT_SEM_VALIDADE,
                colaborador_id: COLABORADOR_ID,
                treinamento_id: null,
                treinamento_codigo: 1,
                tipo_treinamento: "Treinamento 1",
                nome_treinamento: "Treinamento 1",
                data_realizacao: "2026-08-01",
                data_vencimento: null,
                tipo_evidencia: "certificado_individual",
                arquivo_url: "certificados/sem-validade.pdf",
                arquivo_nome: "sem-validade.pdf",
                arquivo_sha256: SHA_1,
                status_validacao: "Válido",
                principal: true,
                historica: false,
                origem: "upload",
                created_at: "2026-08-01T10:00:00.000Z",
                updated_at: "2026-08-01T10:00:00.000Z",
            },
            {
                id: EVID_CERT_2,
                certificado_origem_id: CERT_ATENCAO,
                colaborador_id: COLABORADOR_ID,
                treinamento_id: null,
                treinamento_codigo: 3,
                tipo_treinamento: "Treinamento 3",
                nome_treinamento: "Treinamento 3",
                data_realizacao: atencao.realizacao,
                data_vencimento: atencao.vencimento,
                tipo_evidencia: "certificado_individual",
                arquivo_url: "certificados/atencao.pdf",
                arquivo_nome: "atencao.pdf",
                arquivo_sha256: SHA_2,
                status_validacao: "Válido",
                principal: true,
                historica: false,
                origem: "upload",
                created_at: "2026-08-02T10:00:00.000Z",
                updated_at: "2026-08-02T10:00:00.000Z",
            },
            {
                id: EVID_LISTA,
                certificado_origem_id: CERT_ATENCAO,
                colaborador_id: COLABORADOR_ID,
                treinamento_id: null,
                treinamento_codigo: 3,
                tipo_treinamento: "Treinamento 3",
                nome_treinamento: "Treinamento 3",
                data_realizacao: atencao.realizacao,
                data_vencimento: atencao.vencimento,
                tipo_evidencia: "lista_presenca",
                arquivo_url: "certificados/lista-presenca.pdf",
                arquivo_nome: "lista-presenca.pdf",
                arquivo_sha256: null,
                status_validacao: "Válido",
                principal: false,
                historica: false,
                origem: "upload",
                created_at: "2026-08-02T11:00:00.000Z",
                updated_at: "2026-08-02T11:00:00.000Z",
            },
        ],
        verificacoes_documentais: [
            {
                id: "88888888-8888-4888-8888-888888888888",
                documento_id: CERT_SEM_VALIDADE,
                colaborador_id: COLABORADOR_ID,
                origem_tipo: "certificado",
                origem_tabela: "certificados",
                tipo_documento: "certificado_treinamento",
                hash_arquivo: SHA_1,
                status_verificacao: "aprovado",
                nivel_risco: "baixo",
                score_risco: 0,
                indicios: [],
                recomendacoes: [],
                resumo: "Documento aprovado anteriormente.",
                observacao_manual: "",
                origem_analise: "smoke_anterior",
                retorno_ia: null,
                created_at: "2026-08-03T10:00:00.000Z",
                updated_at: "2026-08-03T10:00:00.000Z",
            },
            {
                id: "99999999-9999-4999-8999-999999999999",
                documento_id: CERT_ATENCAO,
                colaborador_id: COLABORADOR_ID,
                origem_tipo: "certificado",
                origem_tabela: "certificados",
                tipo_documento: "certificado_treinamento",
                hash_arquivo: SHA_2,
                status_verificacao: "aprovado",
                nivel_risco: "baixo",
                score_risco: 0,
                indicios: [],
                recomendacoes: [],
                resumo: "Documento aprovado anteriormente.",
                observacao_manual: "",
                origem_analise: "smoke_anterior",
                retorno_ia: null,
                created_at: "2026-08-03T11:00:00.000Z",
                updated_at: "2026-08-03T11:00:00.000Z",
            },
        ],
        funcoes_treinamentos: [],
        treinamentos_revisoes: [],
    };
}

function valorCampo(item, campo) {
    if (!campo.includes("->>")) return item?.[campo];
    const [raiz, chave] = campo.split("->>");
    return item?.[raiz]?.[chave];
}

function criarQueryBuilder(linhasOriginais = [], { erroMaybeSingle = null } = {}) {
    let linhas = [...linhasOriginais];
    const api = {
        select() { return api; },
        eq(campo, valor) {
            linhas = linhas.filter((item) => valorCampo(item, campo) === valor);
            return api;
        },
        in(campo, valores) {
            const permitidos = new Set(valores || []);
            linhas = linhas.filter((item) => permitidos.has(valorCampo(item, campo)));
            return api;
        },
        order(campo, { ascending = true } = {}) {
            linhas.sort((a, b) => {
                const va = String(valorCampo(a, campo) ?? "");
                const vb = String(valorCampo(b, campo) ?? "");
                return ascending ? va.localeCompare(vb) : vb.localeCompare(va);
            });
            return api;
        },
        limit(total) {
            linhas = linhas.slice(0, Number(total) || 0);
            return api;
        },
        maybeSingle() {
            if (erroMaybeSingle) {
                return Promise.resolve({ data: null, error: { message: erroMaybeSingle } });
            }
            return Promise.resolve({ data: linhas[0] || null, error: null });
        },
        then(resolveThen, rejectThen) {
            return Promise.resolve({ data: linhas, error: null }).then(resolveThen, rejectThen);
        },
    };
    return api;
}

function shaPorCaminho(caminho = "") {
    const nome = String(caminho);
    if (nome.includes("sem-validade")) return SHA_1;
    if (nome.includes("lista-presenca")) return SHA_LISTA;
    return SHA_2;
}

function criarVerificadorMock({ hashDivergenteCaminho = "" } = {}) {
    const chamadas = [];
    const verificar = async (opcoes = {}) => {
        chamadas.push({
            salvarResultado: opcoes.salvarResultado,
            arquivoNome: opcoes.certificado?.arquivo_nome,
            treinamentoCodigo: opcoes.certificado?.treinamento_codigo,
        });

        const nome = String(opcoes.certificado?.arquivo_nome || "");
        const hashNormal = shaPorCaminho(nome);
        const hash = hashDivergenteCaminho && nome.includes(hashDivergenteCaminho)
            ? SHA_DIVERGENTE
            : hashNormal;
        const lista = nome.includes("lista-presenca");
        const colaboradorNome = opcoes.colaborador?.nome || "COLABORADOR TESTE I2 P2 P2A";
        const treinamentoNome = opcoes.treinamento?.nome || opcoes.certificado?.nome_treinamento || "";

        return {
            documentoId: opcoes.certificado?.id,
            documento_id: opcoes.certificado?.id,
            hashArquivo: hash,
            hash_arquivo: hash,
            dataRealizacao: opcoes.certificado?.data_realizacao || null,
            data_realizacao: opcoes.certificado?.data_realizacao || null,
            dataVencimento: opcoes.certificado?.data_vencimento || null,
            data_vencimento: opcoes.certificado?.data_vencimento || null,
            tipoDocumento: lista ? "lista_presenca" : "certificado_treinamento",
            tipo_documento: lista ? "lista_presenca" : "certificado_treinamento",
            statusVerificacao: "aprovado",
            status_verificacao: "aprovado",
            nivelRisco: "baixo",
            nivel_risco: "baixo",
            scoreRisco: 0,
            score_risco: 0,
            indicios: [],
            recomendacoes: [],
            resumo: lista ? "Lista de presença reprocessada." : "Certificado reprocessado.",
            origemAnalise: "ocr_local",
            origem_analise: "ocr_local",
            retornoIa: {
                leitura_documental_local: {
                    executado: true,
                    tipo_leitura: "pdf_texto",
                    confianca: 91,
                    paginas_lidas: 1,
                    total_paginas: 1,
                    datas_encontradas: [],
                    campos_extraidos: {},
                },
                conferencia_documental: {
                    tipoLeitura: "pdf_texto",
                    perfilDocumental: lista ? "lista_presenca" : "certificado_individual",
                    documentoCorretoPorConferencia: true,
                    colaborador: {
                        encontrado: true,
                        nomeCadastro: colaboradorNome,
                        nomeExtraidoColetivo: colaboradorNome,
                        confiancaIdentificacao: "alta",
                        scoreIdentificacao: 92,
                        origemIdentificacao: "texto_pdf",
                    },
                    cpf: {
                        informadoCadastro: true,
                        cpfCadastro: "11122233344",
                        encontradoNoDocumento: true,
                        cpfsExtraidos: ["11122233344"],
                    },
                    treinamento: {
                        encontrado: true,
                        nomeCadastro: treinamentoNome,
                        encontradoNoTexto: true,
                        validadoPorConferencia: true,
                        observacao: "",
                    },
                    empresa: {},
                    listaPresenca: { encontrado: lista },
                },
            },
        };
    };
    verificar.chamadas = chamadas;
    return verificar;
}

function criarSupabaseMock({
    shaOutroColaborador = null,
    falhaDownloadCaminho = "",
    atrasoConclusaoMs = 0,
    modoConclusao = "sucesso",
    falhasLeituraRevisao = 0,
    visibilidadeRevisaoAposLeituras = 0,
} = {}) {
    const dados = criarDados();
    const chamadas = [];
    const downloads = [];
    let conclusoes = 0;
    let payloadConclusao = null;
    let leiturasRevisao = 0;

    return {
        from(tabela) {
            if (!Object.hasOwn(dados, tabela)) throw new Error(`Tabela mock não configurada: ${tabela}`);
            if (tabela === "treinamentos_revisoes") {
                leiturasRevisao += 1;
                if (leiturasRevisao <= falhasLeituraRevisao) {
                    return criarQueryBuilder([], {
                        erroMaybeSingle: `falha controlada de reconciliação ${leiturasRevisao}`,
                    });
                }
                const linhasVisiveis = leiturasRevisao <= visibilidadeRevisaoAposLeituras
                    ? []
                    : dados[tabela];
                return criarQueryBuilder(linhasVisiveis);
            }
            return criarQueryBuilder(dados[tabela]);
        },
        storage: {
            from(bucket) {
                assert.equal(bucket, "certificados-treinamentos");
                return {
                    async download(caminho) {
                        downloads.push(caminho);
                        if (falhaDownloadCaminho && String(caminho).includes(falhaDownloadCaminho)) {
                            return { data: null, error: { message: "download controlado falhou" } };
                        }
                        const blob = new Blob([`arquivo:${caminho}`], { type: "application/pdf" });
                        return { data: blob, error: null };
                    },
                };
            },
        },
        async rpc(nome, params = {}) {
            chamadas.push({ nome, params: structuredClone(params) });
            if (nome === "consultar_vinculos_sha256_revisao_treinamentos") {
                const sha = params.p_sha256;
                const outro = shaOutroColaborador && sha === shaOutroColaborador;
                return {
                    data: {
                        sha256: sha,
                        total_vinculos: outro ? 2 : 1,
                        mesmo_colaborador_total: 1,
                        outros_colaboradores_acessiveis_total: outro ? 1 : 0,
                        possui_vinculo_fora_escopo: false,
                        outros_colaboradores_acessiveis: outro
                            ? [{
                                evidencia_id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                                colaborador_id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
                                colaborador_nome: "OUTRO COLABORADOR",
                                treinamento_codigo: 3,
                                nome_treinamento: "Treinamento 3",
                                tipo_evidencia: "certificado_individual",
                            }]
                            : [],
                    },
                    error: null,
                };
            }
            if (nome === "concluir_revisao_treinamentos") {
                conclusoes += 1;
                payloadConclusao = structuredClone(params);
                if (atrasoConclusaoMs) {
                    await new Promise((resolvePromise) => setTimeout(resolvePromise, atrasoConclusaoMs));
                }
                const revisao = {
                    colaborador_id: COLABORADOR_ID,
                    id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(conclusoes).padStart(12, "0")}`,
                    numero_revisao: conclusoes,
                    total_treinamentos: params.p_itens.length,
                    percentual_conformidade: params.p_resumo.percentual_conformidade,
                    resumo: structuredClone(params.p_resumo),
                    status: "concluida",
                    created_at: new Date().toISOString(),
                };
                if (modoConclusao === "timeout_gravou") {
                    dados.treinamentos_revisoes.push(revisao);
                    return { data: null, error: { message: "timeout simulado após commit" } };
                }
                if (modoConclusao === "erro_sem_gravar") {
                    return { data: null, error: { message: "falha de rede simulada" } };
                }
                dados.treinamentos_revisoes.push(revisao);
                return {
                    data: {
                        ok: true,
                        revisao_id: revisao.id,
                        numero_revisao: revisao.numero_revisao,
                        total_treinamentos: revisao.total_treinamentos,
                        percentual_conformidade: revisao.percentual_conformidade,
                        pdf_bucket: "revisoes-treinamentos",
                        pdf_caminho_esperado: `${COLABORADOR_ID}/${revisao.id}/revisao-${revisao.numero_revisao}.pdf`,
                    },
                    error: null,
                };
            }
            throw new Error(`RPC mock não configurada: ${nome}`);
        },
        mutarCertificado() {
            dados.certificados[0].observacao = `alterado-${Date.now()}`;
            dados.certificados[0].updated_at = new Date().toISOString();
        },
        get chamadas() { return chamadas; },
        get downloads() { return downloads; },
        get conclusoes() { return conclusoes; },
        get payloadConclusao() { return payloadConclusao; },
        get leiturasRevisao() { return leiturasRevisao; },
    };
}

let viteServer = null;

try {
    viteServer = await createServer({
        root: repoRoot,
        configFile: false,
        appType: "custom",
        logLevel: "error",
        optimizeDeps: { noDiscovery: true, include: [] },
        server: { middlewareMode: true, hmr: false },
    });

    const ambienteSsr = viteServer?.environments?.ssr;
    assert.ok(ambienteSsr, "Vite deve expor o ambiente SSR.");
    assert.equal(isRunnableDevEnvironment(ambienteSsr), true);

    const service = await ambienteSsr.runner.import("/src/services/treinamentosRevisaoService.js");
    const motor = await ambienteSsr.runner.import("/src/services/treinamentosRevisaoMotorService.js");

    assert.equal(service.TREINAMENTOS_REVISAO_SERVICE_VERSAO, "treinamentos-revisao-service-i3-p2-f2");
    assert.equal(service.TREINAMENTOS_REVISAO_SCHEMA_VERSAO, 1);
    assert.equal(typeof service.prepararPreviaRevisaoTreinamentosService, "function");
    assert.equal(typeof service.recalcularFonteFingerprintRevisaoTreinamentosService, "function");
    assert.equal(typeof service.gerarConclusaoFingerprintRevisaoTreinamentos, "function");
    assert.equal(typeof service.montarPayloadConclusaoRevisaoTreinamentos, "function");
    assert.equal(typeof service.concluirRevisaoTreinamentosService, "function");
    assert.equal(typeof service.listarHistoricoRevisoesTreinamentosService, "function");
    assert.equal(typeof service.obterHistoricoRevisaoTreinamentosService, "function");

    const verificar = criarVerificadorMock();
    const supabase = criarSupabaseMock();
    const eventosProgresso = [];
    const previa = await service.prepararPreviaRevisaoTreinamentosService({
        supabase,
        colaboradorId: COLABORADOR_ID,
        dataReferencia: hojeIsoLocal(),
        verificarCertificado: verificar,
        limiteConcorrencia: 2,
        onProgresso: (evento) => eventosProgresso.push(evento),
    });

    assert.equal(previa.readOnly, true);
    assert.equal(previa.motorVersion, motor.TREINAMENTOS_REVISAO_MOTOR_VERSAO);
    assert.match(previa.geradoEm, /^\d{4}-\d{2}-\d{2}T/);
    assert.match(previa.fonteFingerprint, /^[0-9a-f]{64}$/);
    assert.match(previa.previaFingerprint, /^[0-9a-f]{64}$/);
    assert.equal(previa.denominadorTreinamentos, 2);
    assert.equal(previa.totalTreinamentosLogicos, 2);
    assert.equal(previa.itens.reduce((total, item) => total + item.quantidadeEvidencias, 0), 3);
    assert.equal(previa.itens.some((item) => item.evidencias.some((e) => e.tipoEvidencia === "lista_presenca")), true);
    assert.equal(previa.resumo[motor.TREINAMENTOS_REVISAO_STATUS.CONFORME], 1);
    assert.equal(previa.resumo[motor.TREINAMENTOS_REVISAO_STATUS.ATENCAO], 1);
    assert.equal(previa.percentualConformidade, 50);
    assert.equal(previa.requerRevisaoHumana, false);
    assert.equal(previa.diagnostico.evidenciasReprocessadas, 3);
    assert.equal(previa.diagnostico.evidenciasComFalhaReprocessamento, 0);
    assert.equal(supabase.downloads.length, 3, "Cada evidência física deve ser baixada uma vez.");
    assert.equal(verificar.chamadas.length, 3, "Cada evidência física deve ser reprocessada pelo verificador canônico.");
    assert.equal(verificar.chamadas.every((item) => item.salvarResultado === false), true);
    assert.equal(previa.shasReferencia.includes(SHA_LISTA), true, "SHA calculado no reprocessamento deve entrar na consulta transversal.");
    assert.equal(
        supabase.chamadas.some((item) =>
            item.nome === "consultar_vinculos_sha256_revisao_treinamentos" && item.params.p_sha256 === SHA_LISTA
        ),
        true,
        "Evidência sem SHA persistido deve usar o SHA físico reprocessado na RPC transversal."
    );
    assert.equal(supabase.conclusoes, 0, "Preparar prévia não pode concluir revisão.");
    assert.equal(eventosProgresso.length, 4, "Progresso deve emitir início + uma atualização por evidência concluída.");
    assert.deepEqual(
        eventosProgresso.map((evento) => evento.concluidas),
        [0, 1, 2, 3],
        "Contador de progresso deve avançar apenas quando uma evidência realmente termina."
    );
    assert.deepEqual(
        eventosProgresso.map((evento) => evento.total),
        [3, 3, 3, 3],
        "Total do progresso deve permanecer estável durante a execução."
    );
    assert.deepEqual(
        eventosProgresso.map((evento) => evento.percentual),
        [0, 33.33, 66.67, 100],
        "Percentual deve ser derivado do número real de evidências concluídas."
    );
    assert.equal(
        eventosProgresso.every((evento) => evento.fase === "reprocessamento_evidencias"),
        true,
        "A UI deve receber uma fase explícita de reprocessamento de evidências."
    );
    console.log("I3_P2_F2_REAL_PROGRESS_CALLBACK=OK");

    const itemAtencao = previa.itens.find((item) => item.treinamentoCodigo === 3);
    assert.equal(itemAtencao.statusRevisao, motor.TREINAMENTOS_REVISAO_STATUS.ATENCAO);
    assert.equal(itemAtencao.statusTemporalPersistencia, "atencao");
    assert.equal(itemAtencao.statusTemporalAnteriorPersistencia, "atencao");
    assert.equal(itemAtencao.quantidadeEvidencias, 2, "Lista de presença é evidência, não denominador.");

    const evidenciaIndividual = itemAtencao.evidencias.find((item) => item.tipoEvidencia === "certificado_individual");
    assert.equal(evidenciaIndividual.identidadeEncontrada.nomeExtraido, "COLABORADOR TESTE I2 P2 P2A");
    assert.deepEqual(evidenciaIndividual.identidadeEncontrada.cpfsExtraidos, ["11122233344"]);
    assert.equal(evidenciaIndividual.confiancaIdentidade, 0.92);
    assert.equal(evidenciaIndividual.confiancaDocumento, 0.91);
    assert.ok(evidenciaIndividual.treinamentoIdentificado);
    assert.ok(evidenciaIndividual.verificacaoAnterior);
    assert.ok(evidenciaIndividual.verificacaoReprocessada);
    assert.equal(evidenciaIndividual.reprocessamento.hashConfere, true);
    const evidenciaLista = itemAtencao.evidencias.find((item) => item.tipoEvidencia === "lista_presenca");
    assert.equal(evidenciaLista.arquivoSha256Persistido, null);
    assert.equal(evidenciaLista.arquivoSha256, SHA_LISTA);
    assert.equal(evidenciaLista.reprocessamento.hashConfere, null);

    const conclusaoFingerprint = await service.gerarConclusaoFingerprintRevisaoTreinamentos({ previa });
    assert.match(conclusaoFingerprint, /^[0-9a-f]{64}$/);
    const payload = service.montarPayloadConclusaoRevisaoTreinamentos({
        previa,
        conclusaoFingerprint,
    });
    assert.equal(payload.p_colaborador_id, COLABORADOR_ID);
    assert.equal(payload.p_itens.length, 2);
    assert.equal(payload.p_resumo.percentual_conformidade, 50);
    assert.equal(payload.p_resumo.fonte_fingerprint, previa.fonteFingerprint);
    assert.equal(payload.p_resumo.previa_fingerprint, previa.previaFingerprint);
    assert.equal(payload.p_resumo.conclusao_fingerprint, conclusaoFingerprint);
    assert.equal(payload.p_resumo.reprocessamento_fisico, true);
    assert.equal(payload.p_itens.find((item) => item.treinamento_codigo === 3).status_temporal_anterior, "atencao");
    assert.equal(payload.p_itens.find((item) => item.treinamento_codigo === 1).status_temporal_anterior, "nao_aplicavel");
    assert.ok(payload.p_itens.find((item) => item.treinamento_codigo === 3).evidencias[0].verificacao_reprocessada);
    assert.equal(typeof JSON.stringify(payload), "string", "Payload precisa ser totalmente serializável.");

    await assert.rejects(
        service.prepararPreviaRevisaoTreinamentosService({
            supabase: criarSupabaseMock(),
            colaboradorId: COLABORADOR_ID,
            dataReferencia: ontemIsoLocal(),
            verificarCertificado: criarVerificadorMock(),
        }),
        /somente a situação atual/i
    );

    const supabaseFalha = criarSupabaseMock({ falhaDownloadCaminho: "lista-presenca" });
    const previaFalha = await service.prepararPreviaRevisaoTreinamentosService({
        supabase: supabaseFalha,
        colaboradorId: COLABORADOR_ID,
        verificarCertificado: criarVerificadorMock(),
    });
    const itemFalha = previaFalha.itens.find((item) => item.treinamentoCodigo === 3);
    const evidenciaFalha = itemFalha.evidencias.find((item) => item.tipoEvidencia === "lista_presenca");
    assert.equal(previaFalha.totalTreinamentosLogicos, 2, "Falha em um arquivo não pode abortar a revisão inteira.");
    assert.equal(previaFalha.diagnostico.evidenciasComFalhaReprocessamento, 1);
    assert.equal(evidenciaFalha.reprocessamento.ok, false);
    assert.equal(itemFalha.statusRevisao, motor.TREINAMENTOS_REVISAO_STATUS.REVISAO_MANUAL_NECESSARIA);

    const supabaseHash = criarSupabaseMock();
    const previaHash = await service.prepararPreviaRevisaoTreinamentosService({
        supabase: supabaseHash,
        colaboradorId: COLABORADOR_ID,
        verificarCertificado: criarVerificadorMock({ hashDivergenteCaminho: "atencao" }),
    });
    const itemHash = previaHash.itens.find((item) => item.treinamentoCodigo === 3);
    const evidenciaHash = itemHash.evidencias.find((item) => item.tipoEvidencia === "certificado_individual");
    assert.equal(evidenciaHash.reprocessamento.hashConfere, false);
    assert.equal(evidenciaHash.verificacaoReprocessada.statusVerificacao, "bloqueado");
    assert.equal(itemHash.statusRevisao, motor.TREINAMENTOS_REVISAO_STATUS.REVISAO_MANUAL_NECESSARIA);

    const supabaseSha = criarSupabaseMock({ shaOutroColaborador: SHA_LISTA });
    const previaSha = await service.prepararPreviaRevisaoTreinamentosService({
        supabase: supabaseSha,
        colaboradorId: COLABORADOR_ID,
        verificarCertificado: criarVerificadorMock(),
    });
    const itemSha = previaSha.itens.find((item) => item.treinamentoCodigo === 3);
    const evidenciaSha = itemSha.evidencias.find((item) => item.arquivoSha256 === SHA_LISTA);
    assert.equal(itemSha.statusRevisao, motor.TREINAMENTOS_REVISAO_STATUS.DIVERGENTE);
    assert.equal(evidenciaSha.duplicidadeOutroColaborador, true);
    assert.equal(evidenciaSha.statusIntegridade, "possivel_outro_colaborador");

    const supabaseStale = criarSupabaseMock();
    const previaStale = await service.prepararPreviaRevisaoTreinamentosService({
        supabase: supabaseStale,
        colaboradorId: COLABORADOR_ID,
        verificarCertificado: criarVerificadorMock(),
    });
    supabaseStale.mutarCertificado();
    await assert.rejects(
        service.concluirRevisaoTreinamentosService({
            supabase: supabaseStale,
            previa: previaStale,
            confirmarConclusao: true,
        }),
        /Prévia desatualizada/i
    );
    assert.equal(supabaseStale.conclusoes, 0, "Prévia stale deve bloquear antes da RPC de escrita.");

    await assert.rejects(
        service.concluirRevisaoTreinamentosService({ supabase, previa }),
        /confirmação explícita/i
    );
    assert.equal(supabase.conclusoes, 0, "Sem confirmação explícita não pode existir RPC de escrita.");

    const supabaseConcorrencia = criarSupabaseMock({ atrasoConclusaoMs: 40 });
    const previaConcorrencia = await service.prepararPreviaRevisaoTreinamentosService({
        supabase: supabaseConcorrencia,
        colaboradorId: COLABORADOR_ID,
        verificarCertificado: criarVerificadorMock(),
    });
    const primeira = service.concluirRevisaoTreinamentosService({
        supabase: supabaseConcorrencia,
        previa: previaConcorrencia,
        confirmarConclusao: true,
    });
    const segunda = service.concluirRevisaoTreinamentosService({
        supabase: supabaseConcorrencia,
        previa: previaConcorrencia,
        confirmarConclusao: true,
    });
    const resultadosConcorrencia = await Promise.allSettled([primeira, segunda]);
    assert.equal(resultadosConcorrencia.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(resultadosConcorrencia.filter((item) => item.status === "rejected").length, 1);
    assert.match(String(resultadosConcorrencia.find((item) => item.status === "rejected")?.reason?.message), /em andamento/i);
    assert.equal(supabaseConcorrencia.conclusoes, 1, "Trava local deve impedir segunda RPC simultânea.");

    const setTimeoutOriginal = globalThis.setTimeout;
    globalThis.setTimeout = (callback, _ms, ...args) =>
        setTimeoutOriginal(callback, 0, ...args);
    try {
        const supabaseTimeout = criarSupabaseMock({ modoConclusao: "timeout_gravou" });
        const previaTimeout = await service.prepararPreviaRevisaoTreinamentosService({
            supabase: supabaseTimeout,
            colaboradorId: COLABORADOR_ID,
            verificarCertificado: criarVerificadorMock(),
        });
        const resultadoTimeout = await service.concluirRevisaoTreinamentosService({
            supabase: supabaseTimeout,
            previa: previaTimeout,
            confirmarConclusao: true,
        });
        assert.equal(resultadoTimeout.ok, true);
        assert.equal(resultadoTimeout.reconciliada, true);
        assert.equal(resultadoTimeout.resposta_rpc_perdida, true);
        assert.equal(resultadoTimeout.pdf_bucket, "revisoes-treinamentos");
        assert.equal(
            resultadoTimeout.pdf_caminho_esperado,
            `${COLABORADOR_ID}/${resultadoTimeout.revisao_id}/revisao-${resultadoTimeout.numero_revisao}.pdf`
        );
        assert.equal(supabaseTimeout.conclusoes, 1, "Reconciliação não pode repetir a RPC de escrita.");

        const supabaseVisibilidadeAtrasada = criarSupabaseMock({
            modoConclusao: "timeout_gravou",
            visibilidadeRevisaoAposLeituras: 2,
        });
        const previaVisibilidadeAtrasada = await service.prepararPreviaRevisaoTreinamentosService({
            supabase: supabaseVisibilidadeAtrasada,
            colaboradorId: COLABORADOR_ID,
            verificarCertificado: criarVerificadorMock(),
        });
        const resultadoVisibilidadeAtrasada = await service.concluirRevisaoTreinamentosService({
            supabase: supabaseVisibilidadeAtrasada,
            previa: previaVisibilidadeAtrasada,
            confirmarConclusao: true,
        });
        assert.equal(resultadoVisibilidadeAtrasada.ok, true);
        assert.equal(resultadoVisibilidadeAtrasada.reconciliada, true);
        assert.ok(resultadoVisibilidadeAtrasada.tentativas_reconciliacao >= 3);
        assert.equal(supabaseVisibilidadeAtrasada.conclusoes, 1);

        const supabaseLeituraFalhouUmaVez = criarSupabaseMock({
            modoConclusao: "timeout_gravou",
            falhasLeituraRevisao: 1,
        });
        const previaLeituraFalhouUmaVez = await service.prepararPreviaRevisaoTreinamentosService({
            supabase: supabaseLeituraFalhouUmaVez,
            colaboradorId: COLABORADOR_ID,
            verificarCertificado: criarVerificadorMock(),
        });
        const resultadoLeituraFalhouUmaVez = await service.concluirRevisaoTreinamentosService({
            supabase: supabaseLeituraFalhouUmaVez,
            previa: previaLeituraFalhouUmaVez,
            confirmarConclusao: true,
        });
        assert.equal(resultadoLeituraFalhouUmaVez.ok, true);
        assert.equal(resultadoLeituraFalhouUmaVez.reconciliada, true);
        assert.ok(resultadoLeituraFalhouUmaVez.tentativas_reconciliacao >= 2);
        assert.equal(supabaseLeituraFalhouUmaVez.conclusoes, 1);

        const supabaseErro = criarSupabaseMock({ modoConclusao: "erro_sem_gravar" });
        const previaErro = await service.prepararPreviaRevisaoTreinamentosService({
            supabase: supabaseErro,
            colaboradorId: COLABORADOR_ID,
            verificarCertificado: criarVerificadorMock(),
        });
        let erroDesconhecido = null;
        try {
            await service.concluirRevisaoTreinamentosService({
                supabase: supabaseErro,
                previa: previaErro,
                confirmarConclusao: true,
            });
        } catch (error) {
            erroDesconhecido = error;
        }
        assert.ok(erroDesconhecido);
        assert.equal(erroDesconhecido.resultadoDesconhecido, true);
        assert.match(erroDesconhecido.conclusaoFingerprint, /^[0-9a-f]{64}$/);
        assert.equal(erroDesconhecido.tentativasReconciliacao, 6);
        assert.equal(supabaseErro.conclusoes, 1, "Falha desconhecida não pode provocar retry automático.");

        const supabaseReconFalha = criarSupabaseMock({
            modoConclusao: "erro_sem_gravar",
            falhasLeituraRevisao: 99,
        });
        const previaReconFalha = await service.prepararPreviaRevisaoTreinamentosService({
            supabase: supabaseReconFalha,
            colaboradorId: COLABORADOR_ID,
            verificarCertificado: criarVerificadorMock(),
        });
        let erroReconFalha = null;
        try {
            await service.concluirRevisaoTreinamentosService({
                supabase: supabaseReconFalha,
                previa: previaReconFalha,
                confirmarConclusao: true,
            });
        } catch (error) {
            erroReconFalha = error;
        }
        assert.ok(erroReconFalha);
        assert.equal(erroReconFalha.resultadoDesconhecido, true);
        assert.match(erroReconFalha.conclusaoFingerprint, /^[0-9a-f]{64}$/);
        assert.match(String(erroReconFalha.erroReconciliacao), /falha controlada de reconciliação/i);
        assert.equal(erroReconFalha.tentativasReconciliacao, 6);
        assert.equal(supabaseReconFalha.conclusoes, 1, "Falha de reconciliação não pode repetir a escrita.");
    } finally {
        globalThis.setTimeout = setTimeoutOriginal;
    }

    const supabaseSucesso = criarSupabaseMock();
    const previaSucesso = await service.prepararPreviaRevisaoTreinamentosService({
        supabase: supabaseSucesso,
        colaboradorId: COLABORADOR_ID,
        verificarCertificado: criarVerificadorMock(),
    });
    const conclusao = await service.concluirRevisaoTreinamentosService({
        supabase: supabaseSucesso,
        previa: previaSucesso,
        confirmarConclusao: true,
    });
    assert.equal(conclusao.ok, true);
    assert.equal(conclusao.reconciliada, false);
    assert.equal(conclusao.pdf_bucket, "revisoes-treinamentos");
    assert.match(conclusao.pdf_caminho_esperado, /\/revisao-1\.pdf$/);
    assert.equal(supabaseSucesso.conclusoes, 1);
    assert.match(supabaseSucesso.payloadConclusao.p_resumo.conclusao_fingerprint, /^[0-9a-f]{64}$/);
    assert.equal(
        supabaseSucesso.chamadas.filter((item) => item.nome === "concluir_revisao_treinamentos").length,
        1,
        "Conclusão normal deve usar uma única RPC de escrita."
    );

    assert.throws(
        () => service.montarPayloadConclusaoRevisaoTreinamentos({
            previa: { ...previa, motorVersion: "motor-incompativel" },
        }),
        /versão do motor/i
    );

    const REVISAO_HIST_ID = "abababab-abab-4bab-8bab-abababababab";
    const ITEM_HIST_ID = "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd";
    const EVID_HIST_ID = "efefefef-efef-4fef-8fef-efefefefefef";
    const tabelasHistorico = {
        treinamentos_revisoes: [{
            id: REVISAO_HIST_ID,
            colaborador_id: COLABORADOR_ID,
            empresa_id: EMPRESA_ID,
            numero_revisao: 1,
            data_referencia: hojeIsoLocal(),
            status: "concluida",
            motor_versao: motor.TREINAMENTOS_REVISAO_MOTOR_VERSAO,
            schema_versao: 1,
            executado_por_email: "teste@safescan.local",
            total_treinamentos: 1,
            total_conformes: 1,
            total_atencao: 0,
            total_vencidos: 0,
            total_divergentes: 0,
            total_sem_evidencia: 0,
            total_revisao_manual: 0,
            percentual_conformidade: 100,
            pdf_bucket: null,
            pdf_caminho: null,
            pdf_nome: null,
            pdf_sha256: null,
            pdf_tamanho_bytes: null,
            pdf_gerado_em: null,
            created_at: new Date().toISOString(),
            colaborador_snapshot: { id: COLABORADOR_ID, nome: "COLABORADOR HISTÓRICO" },
            empresa_snapshot: { id: EMPRESA_ID, nome: "EMPRESA HISTÓRICO" },
            resumo: { conclusao_fingerprint: "e".repeat(64) },
            snapshot: { schema_versao: 1 },
        }],
        treinamentos_revisao_itens: [{
            id: ITEM_HIST_ID,
            revisao_id: REVISAO_HIST_ID,
            ordem: 1,
            certificado_origem_id: CERT_SEM_VALIDADE,
            treinamento_id: null,
            treinamento_codigo: 1,
            nome_treinamento: "Treinamento histórico",
            data_realizacao_salva: "2026-08-01",
            data_vencimento_salva: null,
            data_realizacao_revisada: "2026-08-01",
            data_vencimento_revisada: null,
            status_temporal_anterior: "nao_aplicavel",
            status_temporal_revisado: "nao_aplicavel",
            status_integridade: "conforme",
            resultado_geral: "conforme",
            evidencias_total: 1,
            divergencias: [],
            decisao_humana: null,
            observacao_manual: null,
            created_at: new Date().toISOString(),
        }],
        treinamentos_revisao_evidencias: [{
            id: EVID_HIST_ID,
            revisao_id: REVISAO_HIST_ID,
            revisao_item_id: ITEM_HIST_ID,
            ordem: 1,
            certificado_evidencia_id: EVID_CERT_1,
            certificado_origem_id: CERT_SEM_VALIDADE,
            tipo_evidencia: "certificado_individual",
            arquivo_nome: "historico.pdf",
            arquivo_url: "historico.pdf",
            arquivo_sha256: SHA_1,
            tipo_documento_esperado: "certificado_treinamento",
            tipo_documento_identificado: "certificado_treinamento",
            treinamento_esperado: "Treinamento histórico",
            treinamento_identificado: "Treinamento histórico",
            status_integridade: "conforme",
            duplicidade_mesmo_colaborador: false,
            duplicidade_outro_colaborador: false,
            vinculo_fora_escopo: false,
            divergencias: [],
            created_at: new Date().toISOString(),
        }],
    };
    let rpcHistoricoChamadas = 0;
    const supabaseHistorico = {
        from(tabela) {
            assert.ok(Object.hasOwn(tabelasHistorico, tabela), `Tabela histórica inesperada: ${tabela}`);
            return criarQueryBuilder(tabelasHistorico[tabela]);
        },
        rpc() {
            rpcHistoricoChamadas += 1;
            throw new Error("Histórico read-only não pode chamar RPC.");
        },
    };

    const historico = await service.listarHistoricoRevisoesTreinamentosService({
        supabase: supabaseHistorico,
        colaboradorId: COLABORADOR_ID,
    });
    assert.equal(historico.readOnly, true);
    assert.equal(historico.total, 1);
    assert.equal(historico.revisoes[0].numeroRevisao, 1);
    assert.equal(historico.revisoes[0].percentualConformidade, 100);
    assert.equal(historico.revisoes[0].pdfDisponivel, false);

    const historicoDetalhe = await service.obterHistoricoRevisaoTreinamentosService({
        supabase: supabaseHistorico,
        revisaoId: REVISAO_HIST_ID,
        colaboradorId: COLABORADOR_ID,
    });
    assert.equal(historicoDetalhe.readOnly, true);
    assert.equal(historicoDetalhe.totalItens, 1);
    assert.equal(historicoDetalhe.totalEvidencias, 1);
    assert.equal(historicoDetalhe.itens[0].evidencias.length, 1);
    assert.equal(historicoDetalhe.itens[0].evidencias[0].arquivoNome, "historico.pdf");
    assert.equal(rpcHistoricoChamadas, 0);

    await assert.rejects(
        service.listarHistoricoRevisoesTreinamentosService({
            supabase: supabaseHistorico,
            colaboradorId: "uuid-invalido",
        }),
        /UUID do colaborador para histórico inválido/
    );

    console.log("I3_P4_HISTORY_LIST_READONLY=OK");
    console.log("I3_P4_HISTORY_DETAIL_READONLY=OK");
    console.log("I3_P4_HISTORY_NO_RPC_WRITE=OK");

    console.log("");
    console.log("I2_P2_P2A_VITE_MODULE_RUNNER=OK");
    console.log("I2_P2_P2A_REAL_REPROCESS_READONLY=OK");
    console.log("I2_P2_P2A_PHYSICAL_EVIDENCE_PER_FILE=OK");
    console.log("I2_P2_P2A_LISTA_PRESENCA_DENOMINATOR=OK");
    console.log("I2_P2_P2A_REPROCESS_FAILURE_ISOLATION=OK");
    console.log("I2_P2_P2A_HASH_INTEGRITY_GUARD=OK");
    console.log("I2_P2_P2A_DERIVED_SHA_CROSS_LINK=OK");
    console.log("I2_P2_P2A_IDENTITY_SNAPSHOT=OK");
    console.log("I2_P2_P2A_PREVIOUS_AND_REPROCESSED_SNAPSHOT=OK");
    console.log("I2_P2_P2A_CURRENT_DATE_ONLY=OK");
    console.log("I2_P2_P2A_SOURCE_FINGERPRINT=OK");
    console.log("I2_P2_P2A_PREVIEW_FINGERPRINT=OK");
    console.log("I2_P2_P2A_STALE_PREVIEW_GUARD=OK");
    console.log("I2_P2_P2A_PREVIOUS_TEMPORAL_STATUS=OK");
    console.log("I2_P2_P2A_LOCAL_CONCURRENCY_LOCK=OK");
    console.log("I2_P2_P2A_TIMEOUT_RECONCILIATION=OK");
    console.log("I2_P2_P2A_NO_AUTORETRY_UNKNOWN=OK");
    console.log("I2_P2_P2A_EXPLICIT_CONFIRMATION_GATE=OK");
    console.log("I2_P2_P2A_SINGLE_WRITE_RPC=OK");
    console.log("I2_P2_P2A_SERIALIZABLE_PAYLOAD=OK");
    console.log("I2_P2_P2A_MOTOR_VERSION_GATE=OK");
    console.log("I2_Q5_F1_MIGRATION_VERSION_SYNC=OK");
    console.log("I2_Q5_F1_RECONCILIATION_STATUS_FILTER=OK");
    console.log("I2_Q5_F1_RECONCILIATION_POLLING_LIMITED=OK");
    console.log("I2_Q5_F1_RECONCILIATION_READ_FAILURE_UNKNOWN=OK");
    console.log("I2_Q5_F1_UNIFORM_PDF_RETURN_CONTRACT=OK");
    console.log("I2_Q5_F1_NO_WRITE_RETRY=OK");
    console.log("SAFESCAN_TREINAMENTOS_REVISAO_I2_P2_P2A_SMOKE_OK");
    console.log("SAFESCAN_TREINAMENTOS_REVISAO_I2_Q5_F1_SMOKE_OK");
} finally {
    if (viteServer) await viteServer.close();
}
