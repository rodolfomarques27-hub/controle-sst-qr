import { obterUrlLogoEmpresa } from "../../services/supabaseServices";
import { gerarCodigoFuncionario } from "../../services/colaboradorDocumentosService";

export default function criarSuporteDds() {
    const diasDds = [
        { curto: "DOM", nome: "Domingo", data: "14/06/2026", tema: "", responsavel: "" },
        { curto: "SEG", nome: "Segunda-feira", data: "15/06/2026", tema: "", responsavel: "" },
        { curto: "TER", nome: "Terça-feira", data: "16/06/2026", tema: "", responsavel: "" },
        { curto: "QUA", nome: "Quarta-feira", data: "17/06/2026", tema: "", responsavel: "" },
        { curto: "QUI", nome: "Quinta-feira", data: "18/06/2026", tema: "", responsavel: "" },
        { curto: "SEX", nome: "Sexta-feira", data: "19/06/2026", tema: "", responsavel: "" },
        { curto: "SÁB", nome: "Sábado", data: "20/06/2026", tema: "", responsavel: "" },
    ];
    function criarTemasEditaveisDds() {
        return diasDds.map((dia) => ({
            tema: String(dia?.tema || "").trim(),
            responsavel: String(dia?.responsavel || "").trim(),
        }));
    }

    const participantesDds = [
        { nome: "Abílio Soares da Silva", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
        { nome: "Agnaldo Oliveira Machado", funcao: "Ajudante", empresa: "Ribeiro Aquino" },
        { nome: "Anderson Augusto Pereira", funcao: "Líder", empresa: "Ribeiro Aquino" },
        { nome: "André Henrique Ribeiro", funcao: "Engenheiro de Obra", empresa: "Ribeiro Aquino" },
        { nome: "Alcir Pimenta dos Santos", funcao: "Gredista", empresa: "Ribeiro Aquino" },
        { nome: "Aparecido Donizete Veloso", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
        { nome: "Argemiro Menino", funcao: "Armador", empresa: "Ribeiro Aquino" },
        { nome: "Atila Junio de Sousa", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
        { nome: "Cláudio dos Santos", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
        { nome: "Clayton Rodrigues dos Santos", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
        { nome: "Emerson Gonçalves dos Santos", funcao: "Ajudante", empresa: "Ribeiro Aquino" },
        { nome: "Edilson de Carvalho Ribeiro", funcao: "Operador de Máquinas", empresa: "Ribeiro Aquino" },
        { nome: "Erinaldo Rodrigues", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
        { nome: "Edmilson Francisco de Paula", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
        { nome: "Eraldo Alves", funcao: "Ajudante", empresa: "Ribeiro Aquino" },
    ];

    const participantesDdsContinuacao = [
        { numero: 16, nome: "Fábio Henrique dos Santos", funcao: "Carpinteiro", empresa: "Ribeiro Aquino" },
        { numero: 17, nome: "Fernando Alves Pereira", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
        { numero: 18, nome: "Gilberto Martins de Souza", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
        { numero: 19, nome: "Hélio Roberto Nascimento", funcao: "Armador", empresa: "Ribeiro Aquino" },
        { numero: 20, nome: "João Carlos Ferreira", funcao: "Eletricista", empresa: "Ribeiro Aquino" },
        { numero: 21, nome: "José Aparecido Lima", funcao: "Ajudante", empresa: "Ribeiro Aquino" },
        { numero: 22, nome: "Leonardo Silva Araújo", funcao: "Servente", empresa: "Ribeiro Aquino" },
        { numero: 23, nome: "Lucas Pereira Gomes", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
        { numero: 24, nome: "Marcelo Antônio Santos", funcao: "Operador de Betoneira", empresa: "Ribeiro Aquino" },
        { numero: 25, nome: "Márcio Roberto Almeida", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
        { numero: 26, nome: "Paulo Sérgio Oliveira", funcao: "Carpinteiro", empresa: "Ribeiro Aquino" },
        { numero: 27, nome: "Rafael Augusto Moreira", funcao: "Encanador", empresa: "Ribeiro Aquino" },
        { numero: 28, nome: "Renato José Barbosa", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
        { numero: 29, nome: "Roberto Carlos Teixeira", funcao: "Ajudante", empresa: "Ribeiro Aquino" },
        { numero: 30, nome: "Samuel Batista Rocha", funcao: "Armador", empresa: "Ribeiro Aquino" },
        { numero: 31, nome: "Sérgio Luiz Cardoso", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
        { numero: 32, nome: "Tiago Henrique Costa", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
        { numero: 33, nome: "Valdir Gomes Nunes", funcao: "Carpinteiro", empresa: "Ribeiro Aquino" },
        { numero: 34, nome: "Wagner Pereira Lopes", funcao: "Ajudante", empresa: "Ribeiro Aquino" },
        { numero: 35, nome: "Willian José Ribeiro", funcao: "Servente", empresa: "Ribeiro Aquino" },
    ];
    const LIMITE_PARTICIPANTES_PRIMEIRA_FOLHA_DDS = 10;
    const LIMITE_PARTICIPANTES_FOLHA_CONTINUACAO_DDS = 20;
    const QUANTIDADE_LINHAS_COMPLEMENTARES_DDS = 6;
    const aniversariantesDds = [
        { data: "16/06", nome: "Anderson Augusto Pereira" },
        { data: "18/06", nome: "Alcir Pimenta dos Santos" },
    ];

    const CAMPOS_NOME_EMPRESA_DDS = [
        "razao_social",
        "razaoSocial",
        "nome_fantasia",
        "nomeFantasia",
        "nome",
        "empresa",
        "label",
    ];

    const CHAVE_OBRA_SETOR_DDS_POR_EMPRESA = "controle-sst-qr:dds:obra-setor-por-empresa:v1";
    const CHAVE_FISCAL_IDEALIZA_DDS_POR_EMPRESA = "controle-sst-qr:dds:fiscal-idealiza-por-empresa:v1";
    const CHAVE_EMPRESA_SELECIONADA_DDS = "controle-sst-qr:dds:empresa-selecionada:v1";

    const CAMPOS_OBRA_SETOR_DDS = [
        "obra_setor",
        "obraSetor",
        "obra",
        "setor",
        "unidade",
        "local",
        "endereco",
        "endereco_obra",
    ];

    function carregarObrasSetorDdsPorEmpresa() {
        if (typeof window === "undefined" || !window.localStorage) return {};

        try {
            const bruto = window.localStorage.getItem(CHAVE_OBRA_SETOR_DDS_POR_EMPRESA);
            if (!bruto) return {};

            const dados = JSON.parse(bruto);
            return dados && typeof dados === "object" ? dados : {};
        } catch {
            return {};
        }
    }

    function salvarObrasSetorDdsPorEmpresa(dados = {}) {
        if (typeof window === "undefined" || !window.localStorage) return;

        try {
            window.localStorage.setItem(CHAVE_OBRA_SETOR_DDS_POR_EMPRESA, JSON.stringify(dados || {}));
        } catch {
            // Ignora navegador sem localStorage disponível.
        }
    }

    function carregarFiscalIdealizaDdsPorEmpresa() {
        if (typeof window === "undefined" || !window.localStorage) return {};

        try {
            const bruto = window.localStorage.getItem(CHAVE_FISCAL_IDEALIZA_DDS_POR_EMPRESA);
            if (!bruto) return {};

            const dados = JSON.parse(bruto);
            return dados && typeof dados === "object" ? dados : {};
        } catch {
            return {};
        }
    }

    function salvarFiscalIdealizaDdsPorEmpresa(dados = {}) {
        if (typeof window === "undefined" || !window.localStorage) return;

        try {
            window.localStorage.setItem(CHAVE_FISCAL_IDEALIZA_DDS_POR_EMPRESA, JSON.stringify(dados || {}));
        } catch {
            // Ignora navegador sem localStorage disponível.
        }
    }

    function carregarEmpresaSelecionadaDds() {
        if (typeof window === "undefined" || !window.localStorage) return "";

        try {
            return String(window.localStorage.getItem(CHAVE_EMPRESA_SELECIONADA_DDS) || "").trim();
        } catch {
            return "";
        }
    }

    function salvarEmpresaSelecionadaDds(chaveEmpresa = "") {
        if (typeof window === "undefined" || !window.localStorage) return;

        try {
            if (chaveEmpresa) {
                window.localStorage.setItem(CHAVE_EMPRESA_SELECIONADA_DDS, chaveEmpresa);
            } else {
                window.localStorage.removeItem(CHAVE_EMPRESA_SELECIONADA_DDS);
            }
        } catch {
            // Ignora navegador sem localStorage disponível.
        }
    }

    const CAMPOS_FUNCAO_DDS = [
        "funcao",
        "função",
        "funcao_nome",
        "funcaoNome",
        "nome_funcao",
        "nomeFuncao",
        "cargo",
        "cargo_atual",
        "cargoAtual",
        "profissao",
        "profissão",
        "ocupacao",
        "ocupação",
        "atividade",
    ];

    const CAMPOS_TST_EMPRESA_DDS = [
        "tst_responsavel",
        "tstResponsavel",
        "responsavel_tecnico",
        "responsavelTecnico",
        "responsavel_sst",
        "responsavelSst",
        "tecnico_responsavel",
        "tecnicoResponsavel",
    ];

    const CAMPOS_ID_EMPRESA_DDS = [
        "id",
        "empresa_id",
        "empresaId",
        "id_empresa",
        "codigo",
        "uuid",
    ];

    function obterIdEmpresaObjetoDds(empresa = null) {
        return obterPrimeiroTextoDds(empresa, CAMPOS_ID_EMPRESA_DDS);
    }

    function obterObraBaseDds(item = null) {
        if (!item || typeof item !== "object") return {};

        if (item.obra && typeof item.obra === "object") {
            return item.obra;
        }

        return item;
    }
    function obterEmpresaIdObraDds(obra = null) {
        return (
            obterPrimeiroTextoDds(obra, ["empresaId", "empresa_id", "id_empresa"]) ||
            obterPrimeiroTextoDds(obra?.empresa, ["id", "empresa_id", "empresaId"]) ||
            obterPrimeiroTextoDds(obra, ["empresa"])
        );
    }

    function obterIdObraEmpresaDds(obra = null, indice = 0) {
        const obraBase = obterObraBaseDds(obra);

        return String(
            obterPrimeiroTextoDds(obra, ["obraId", "obra_id", "id_obra"]) ||
            obterPrimeiroTextoDds(obraBase, ["id", "uuid"]) ||
            obterPrimeiroTextoDds(obra, ["id", "uuid"]) ||
            `obra-${indice}`
        ).trim();
    }

    function obterNomeObraEmpresaDds(obra = null) {
        const obraBase = obterObraBaseDds(obra);

        return (
            obterPrimeiroTextoDds(obraBase, ["nome", "nome_obra", "nomeObra", "obra_setor", "obraSetor", "obra", "setor", "local"]) ||
            obterPrimeiroTextoDds(obra, ["nome", "nome_obra", "nomeObra", "obra_setor", "obraSetor", "obra", "setor", "local"]) ||
            "Obra cadastrada"
        );
    }

    function obterFiscalObraEmpresaDds(obra = null) {
        const obraBase = obterObraBaseDds(obra);

        return (
            obterPrimeiroTextoDds(obraBase, ["fiscalIdealiza", "fiscal_idealiza", "fiscal", "fiscal_obra", "fiscalObra"]) ||
            obterPrimeiroTextoDds(obra, ["fiscalIdealiza", "fiscal_idealiza", "fiscal", "fiscal_obra", "fiscalObra"])
        );
    }

    function obterLiderObraEmpresaDds(obra = null) {
        const obraBase = obterObraBaseDds(obra);

        return (
            obterPrimeiroTextoDds(obraBase, ["liderEncarregado", "lider_encarregado", "lider", "encarregado", "responsavel_obra", "responsavelObra"]) ||
            obterPrimeiroTextoDds(obra, ["liderEncarregado", "lider_encarregado", "lider", "encarregado", "responsavel_obra", "responsavelObra"])
        );
    }

    function obterChaveEmpresaDds(empresa = null, indice = 0) {
        return String(
            obterIdEmpresaObjetoDds(empresa)
            || obterNomeEmpresaObjetoDds(empresa)
            || `empresa-${indice}`
        ).trim();
    }

    function normalizarComparacaoDds(valor = "") {
        return normalizarTextoCodigoDds(valor)
            .replace(/\s+/g, " ")
            .trim();
    }

    function obterNomeEmpresaColaboradorDds(colaborador = null) {
        if (!colaborador || typeof colaborador !== "object") return "";

        if (colaborador.empresa && typeof colaborador.empresa === "object") {
            return obterNomeEmpresaObjetoDds(colaborador.empresa);
        }

        return String(
            colaborador?.empresa
            || colaborador?.empresa_nome
            || colaborador?.empresaNome
            || colaborador?.nome_empresa
            || colaborador?.razao_social
            || colaborador?.razaoSocial
            || colaborador?.nome_fantasia
            || colaborador?.nomeFantasia
            || ""
        ).trim();
    }

    function obterIdEmpresaColaboradorDds(colaborador = null) {
        if (!colaborador || typeof colaborador !== "object") return "";

        return String(
            colaborador?.empresa_id
            || colaborador?.empresaId
            || colaborador?.id_empresa
            || colaborador?.empresa?.id
            || colaborador?.empresa?.empresa_id
            || ""
        ).trim();
    }

    function colaboradorPertenceEmpresaDds(colaborador = null, empresa = null) {
        if (!empresa) return true;

        const idEmpresa = obterIdEmpresaObjetoDds(empresa);
        const idColaboradorEmpresa = obterIdEmpresaColaboradorDds(colaborador);

        if (idEmpresa && idColaboradorEmpresa && String(idEmpresa) === String(idColaboradorEmpresa)) {
            return true;
        }

        const nomeEmpresa = normalizarComparacaoDds(obterNomeEmpresaObjetoDds(empresa));
        const nomeEmpresaColaborador = normalizarComparacaoDds(obterNomeEmpresaColaboradorDds(colaborador));

        if (nomeEmpresa && nomeEmpresaColaborador && nomeEmpresa === nomeEmpresaColaborador) {
            return true;
        }

        return false;
    }

    function filtrarColaboradoresPorEmpresaDds(colaboradores = [], empresa = null) {
        const lista = Array.isArray(colaboradores) ? colaboradores : [];

        if (!empresa) return lista;

        return lista.filter((colaborador) => colaboradorPertenceEmpresaDds(colaborador, empresa));
    }

    function formatarDataDds(data) {
        const dataSegura = data instanceof Date && !Number.isNaN(data.getTime()) ? data : new Date();
        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(dataSegura);
    }

    function adicionarDiasDds(data, quantidadeDias = 0) {
        const novaData = new Date(data);
        novaData.setDate(novaData.getDate() + quantidadeDias);
        return novaData;
    }

    function obterInicioSemanaDds(dataReferencia = new Date()) {
        const base = dataReferencia instanceof Date && !Number.isNaN(dataReferencia.getTime())
            ? new Date(dataReferencia)
            : new Date();

        base.setHours(0, 0, 0, 0);
        base.setDate(base.getDate() - base.getDay());
        return base;
    }

    function obterFimSemanaDds(inicioSemana = obterInicioSemanaDds()) {
        return adicionarDiasDds(inicioSemana, 6);
    }

    function obterResumoSemanaDds(inicioSemana = obterInicioSemanaDds(), fimSemana = obterFimSemanaDds(inicioSemana)) {
        const diaInicio = String(inicioSemana.getDate()).padStart(2, "0");
        const diaFim = String(fimSemana.getDate()).padStart(2, "0");
        const mesInicio = String(inicioSemana.getMonth() + 1).padStart(2, "0");
        const mesFim = String(fimSemana.getMonth() + 1).padStart(2, "0");

        if (mesInicio === mesFim) {
            return `${diaInicio} a ${diaFim}/${mesFim}`;
        }

        return `${diaInicio}/${mesInicio} a ${diaFim}/${mesFim}`;
    }

    function gerarDiasSemanaDds(inicioSemana = obterInicioSemanaDds()) {
        return diasDds.map((dia, indice) => ({
            ...dia,
            data: formatarDataDds(adicionarDiasDds(inicioSemana, indice)),
        }));
    }

    function normalizarTextoCodigoDds(valor = "") {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9\s]/g, " ")
            .trim()
            .toUpperCase();
    }

    function obterSiglaEmpresaDds(nomeEmpresa = "") {
        const palavrasIgnoradas = new Set(["LTDA", "LTD", "ME", "EPP", "SA", "S", "A", "DE", "DA", "DO", "DAS", "DOS", "CONSTRUCOES", "CONSTRUCAO", "SERVICOS"]);
        const palavras = normalizarTextoCodigoDds(nomeEmpresa)
            .split(/\s+/)
            .filter((parte) => parte && !palavrasIgnoradas.has(parte));

        const sigla = palavras.slice(0, 3).map((parte) => parte[0]).join("");
        return sigla || "SST";
    }

    function gerarCodigoDdsAutomatico(nomeEmpresa = "", inicioSemana = obterInicioSemanaDds()) {
        const ano = inicioSemana.getFullYear();
        const mes = String(inicioSemana.getMonth() + 1).padStart(2, "0");
        const dia = String(inicioSemana.getDate()).padStart(2, "0");
        const sigla = obterSiglaEmpresaDds(nomeEmpresa);

        return `DDS-${ano}-${mes}-${sigla}-${dia}`;
    }

    function obterPrimeiroTextoDds(objeto = null, campos = []) {
        if (!objeto || typeof objeto !== "object") return "";

        for (const campo of campos) {
            const valor = String(objeto?.[campo] || "").trim();
            if (valor) return valor;
        }

        return "";
    }

    function obterNomeEmpresaObjetoDds(empresa = null) {
        return obterPrimeiroTextoDds(empresa, CAMPOS_NOME_EMPRESA_DDS);
    }

    function obterFuncaoPessoaDds(pessoa = null) {
        return obterPrimeiroTextoDds(pessoa, CAMPOS_FUNCAO_DDS);
    }

    function obterTstEmpresaDds(empresa = null) {
        return obterPrimeiroTextoDds(empresa, CAMPOS_TST_EMPRESA_DDS);
    }

    function textoContemTermosDds(texto = "", termos = []) {
        const normalizado = normalizarTextoCodigoDds(texto);
        return termos.some((termo) => normalizado.includes(normalizarTextoCodigoDds(termo)));
    }

    function obterEmpresaBaseDds({ empresasBanco = [], colaboradores = [], empresaSelecionada = null } = {}) {
        if (empresaSelecionada) return empresaSelecionada;
        const empresasValidas = Array.isArray(empresasBanco) ? empresasBanco.filter(Boolean) : [];

        if (empresasValidas.length > 0) {
            return empresasValidas[0];
        }

        const primeiroColaboradorComEmpresa = (Array.isArray(colaboradores) ? colaboradores : []).find((colaborador) =>
            String(colaborador?.empresa || colaborador?.empresa_nome || colaborador?.empresaNome || "").trim()
        );

        const nomeEmpresaColaborador = String(
            primeiroColaboradorComEmpresa?.empresa
            || primeiroColaboradorComEmpresa?.empresa_nome
            || primeiroColaboradorComEmpresa?.empresaNome
            || ""
        ).trim();

        return nomeEmpresaColaborador ? { nome: nomeEmpresaColaborador } : null;
    }

    function obterResponsavelTecnicoDds({ colaboradores = [], usuario = null, empresaSelecionada = null } = {}) {
        const tstEmpresa = obterTstEmpresaDds(empresaSelecionada);

        if (tstEmpresa) {
            return {
                nome: tstEmpresa,
                funcao: "Téc. de Segurança do Trabalho",
            };
        }

        const funcaoUsuario = obterFuncaoPessoaDds(usuario);
        const perfilUsuario = String(usuario?.perfil || "").trim();

        if (
            textoContemTermosDds(funcaoUsuario, ["técnico", "tecnico", "segurança do trabalho", "seguranca do trabalho", "tst"])
            || textoContemTermosDds(perfilUsuario, ["tecnico_sst", "técnico sst", "tecnico sst"])
        ) {
            return {
                nome: String(usuario?.nome || usuario?.name || usuario?.displayName || usuario?.email || "Técnico SST").trim(),
                funcao: funcaoUsuario || "Téc. de Segurança do Trabalho",
            };
        }

        const colaboradorTst = (Array.isArray(colaboradores) ? colaboradores : []).find((colaborador) => {
            const funcao = obterFuncaoPessoaDds(colaborador);
            return textoContemTermosDds(funcao, ["técnico", "tecnico", "segurança do trabalho", "seguranca do trabalho", "tst"]);
        });

        if (colaboradorTst) {
            return {
                nome: String(colaboradorTst.nome || colaboradorTst.nome_completo || colaboradorTst.name || "Técnico SST").trim(),
                funcao: obterFuncaoPessoaDds(colaboradorTst) || "Téc. de Segurança do Trabalho",
            };
        }

        return {
            nome: "Técnico SST não definido",
            funcao: "Téc. de Segurança do Trabalho",
        };
    }

    function obterLiderDds({ colaboradores = [] } = {}) {
        const colaboradorLider = (Array.isArray(colaboradores) ? colaboradores : []).find((colaborador) => {
            const funcao = obterFuncaoPessoaDds(colaborador);
            return textoContemTermosDds(funcao, ["encarregado", "lider", "líder", "mestre", "supervisor"]);
        });

        if (colaboradorLider) {
            return String(colaboradorLider.nome || colaboradorLider.nome_completo || colaboradorLider.name || "Líder não definido").trim();
        }

        return "Líder não definido";
    }

    function montarDadosDdsAutomaticos({ empresasBanco = [], colaboradores = [], usuario = null, empresaSelecionada = null, inicioSemana = obterInicioSemanaDds(), fimSemana = obterFimSemanaDds(inicioSemana) } = {}) {
        const empresaBase = obterEmpresaBaseDds({ empresasBanco, colaboradores, empresaSelecionada });
        const nomeEmpresa = obterNomeEmpresaObjetoDds(empresaBase) || "Empresa não definida";
        const obraSetor = obterPrimeiroTextoDds(empresaBase, CAMPOS_OBRA_SETOR_DDS) || "Obra / Setor não definido";
        const responsavelTecnico = obterResponsavelTecnicoDds({ colaboradores, usuario, empresaSelecionada: empresaBase });
        const periodo = `${formatarDataDds(inicioSemana)} a ${formatarDataDds(fimSemana)}`;

        return {
            empresa: nomeEmpresa,
            obraSetor,
            responsavel: responsavelTecnico.nome,
            funcaoResponsavel: responsavelTecnico.funcao,
            turno: "Diurno",
            fiscalIdealiza: "Fiscal Idealiza não definido",
            encarregado: obterLiderDds({ colaboradores }),
            periodo,
            resumoSemana: obterResumoSemanaDds(inicioSemana, fimSemana),
            codigo: gerarCodigoDdsAutomatico(nomeEmpresa, inicioSemana),
        };
    }

    const dadosDdsPadrao = montarDadosDdsAutomaticos();

    const camposDadosDds = [
        { chave: "obraSetor", rotulo: "Obra / Setor" },
        { chave: "responsavel", rotulo: "Responsável / TST" },
        { chave: "turno", rotulo: "Turno" },
        { chave: "fiscalIdealiza", rotulo: "Fiscal Idealiza" },
        { chave: "encarregado", rotulo: "Líder / Encarregado" },
    ];

    function obterValorTextoDds(...valores) {
        const encontrado = valores.find((valor) => String(valor || "").trim());
        return String(encontrado || "-").trim();
    }

    function abreviarNomePessoaDds(nome = "", limite = 28) {
        const texto = String(nome || "").replace(/\s+/g, " ").trim();

        if (!texto || texto === "-") return "-";
        if (texto.length <= limite) return texto;

        const conectores = new Set(["de", "da", "do", "das", "dos", "e"]);
        const partes = texto.split(" ").filter(Boolean);

        if (partes.length <= 2) return texto;

        const primeira = partes[0];
        const ultima = partes[partes.length - 1];
        const iniciais = partes
            .slice(1, -1)
            .filter((parte) => !conectores.has(parte.toLowerCase()))
            .map((parte) => `${parte[0]}.`);

        const abreviado = [primeira, ...iniciais, ultima].join(" ");

        if (abreviado.length <= limite + 8) return abreviado;

        return `${primeira} ${ultima}`;
    }

    function abreviarFuncaoResponsavelDds(funcao = "") {
        const texto = String(funcao || "").replace(/\s+/g, " ").trim();

        if (!texto || texto === "-") return "-";

        const normalizado = normalizarTextoCodigoDds(texto);

        if (
            normalizado.includes("SEGURANCA DO TRABALHO")
            || normalizado.includes("SEGURANCA TRABALHO")
            || normalizado.includes("TST")
        ) {
            return "Téc. Seg. Trabalho";
        }

        return texto;
    }

    function formatarResponsavelCabecalhoDds(dadosDds = {}) {
        const nome = abreviarNomePessoaDds(dadosDds.responsavel);
        const funcao = abreviarFuncaoResponsavelDds(dadosDds.funcaoResponsavel);

        if (!funcao || funcao === "-") return nome;

        return `${nome} — ${funcao}`;
    }

    function obterCodigoSafescanParticipanteDds(colaborador = {}) {
        if (!colaborador || typeof colaborador !== "object") return "";

        const codigoExistente = obterValorTextoDds(
            colaborador.codigoFuncionario,
            colaborador.codigo_funcionario,
            colaborador.codigoSafescan,
            colaborador.codigoSafeScan,
            colaborador.codigo_safescan,
            colaborador.codigo,
            colaborador.codigo_colaborador,
            colaborador.codigoColaborador,
            colaborador.codigo_qr,
            colaborador.qr_codigo,
            colaborador.codigoQr,
            colaborador.matricula_esocial,
            colaborador.matriculaEsocial,
            colaborador.matricula
        );

        if (codigoExistente) return codigoExistente;

        const nomeColaborador = obterValorTextoDds(
            colaborador.nome,
            colaborador.nomeCompleto,
            colaborador.nome_completo,
            colaborador.colaborador,
            colaborador.nomeColaborador
        );

        return nomeColaborador ? gerarCodigoFuncionario(nomeColaborador) : "";
    }
    function normalizarParticipantesDdsSistema(colaboradores = []) {
        const base = Array.isArray(colaboradores) ? colaboradores : [];

        const obterEmpresaDiretaDds = (colaborador = {}) => {
            const empresaDireta = obterValorTextoDds(
                colaborador.empresaNome,
                colaborador.empresa_nome,
                colaborador.empresa
            );
            if (empresaDireta && !/\bsubcontratada\s*:/i.test(empresaDireta)) return empresaDireta;

            const exibicao = obterValorTextoDds(colaborador.empresaExibicao, colaborador.empresa_exibicao);
            const partes = String(exibicao || "").split(/\bsubcontratada\s*:/i);
            return String(partes.length > 1 ? partes[partes.length - 1] : exibicao || empresaDireta).trim();
        };

        return base
            .map((colaborador, indice) => ({
                numero: indice + 1,
                codigoSafescan: obterCodigoSafescanParticipanteDds(colaborador),
                codigoFuncionario: obterCodigoSafescanParticipanteDds(colaborador),
                codigo_funcionario: obterCodigoSafescanParticipanteDds(colaborador),
                nome: obterValorTextoDds(colaborador.nome, colaborador.nomeCompleto, colaborador.nome_completo),
                funcao: obterFuncaoPessoaDds(colaborador),
                empresa: obterEmpresaDiretaDds(colaborador),
            }))
            .filter((participante) => participante.nome && participante.nome !== "-")
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
            .map((participante, indice) => ({
                ...participante,
                numero: indice + 1,
            }));
    }

    function dividirParticipantesDds(participantes = [], inicio = 15, tamanho = 20) {
        const folhas = [];

        for (let indice = inicio; indice < participantes.length; indice += tamanho) {
            folhas.push(participantes.slice(indice, indice + tamanho));
        }

        return folhas;
    }
    function criarLinhasComplementaresDds(quantidadeLinhas = 6, numeroInicial = 1) {
        const quantidade = Math.max(0, Number(quantidadeLinhas) || 0);

        return Array.from({ length: quantidade }, (_, indice) => ({
            numero: numeroInicial + indice,
            nome: "",
            funcao: "",
            empresa: "",
            linhaEmBranco: true,
        }));
    }

    function montarFolhasDdsComLinhasComplementares(
        participantes = [],
        limitePrimeiraFolha = 10,
        limiteFolhaContinuacao = 20,
        quantidadeLinhasComplementares = 6
    ) {
        const participantesValidos = Array.isArray(participantes)
            ? participantes
            : [];

        const primeiraFolha = participantesValidos.slice(
            0,
            limitePrimeiraFolha
        );

        const folhasContinuacao = dividirParticipantesDds(
            participantesValidos,
            limitePrimeiraFolha,
            limiteFolhaContinuacao
        ).map((folha) => [...folha]);

        const linhasComplementares = criarLinhasComplementaresDds(
            quantidadeLinhasComplementares,
            participantesValidos.length + 1
        );

        if (folhasContinuacao.length === 0) {
            const vagasPrimeiraFolha =
                limitePrimeiraFolha - primeiraFolha.length;

            if (vagasPrimeiraFolha >= linhasComplementares.length) {
                primeiraFolha.push(...linhasComplementares);
            } else {
                folhasContinuacao.push(linhasComplementares);
            }
        } else {
            const ultimaFolha =
                folhasContinuacao[folhasContinuacao.length - 1];

            const vagasUltimaFolha =
                limiteFolhaContinuacao - ultimaFolha.length;

            if (vagasUltimaFolha >= linhasComplementares.length) {
                ultimaFolha.push(...linhasComplementares);
            } else {
                folhasContinuacao.push(linhasComplementares);
            }
        }

        return {
            primeiraFolhaParticipantes: primeiraFolha,
            folhasContinuacaoDds: folhasContinuacao,
        };
    }
    function criarParticipantesAdicionaisConferenciaDds(
        participantesBase = [],
        participantesSalvos = []
    ) {
        const base = Array.isArray(participantesBase)
            ? participantesBase
            : [];

        const maiorNumeroBase = base.reduce(
            (maior, participante, indice) =>
                Math.max(
                    maior,
                    Number(participante?.numero || indice + 1) || 0
                ),
            0
        );

        const adicionaisSalvos = (
            Array.isArray(participantesSalvos)
                ? participantesSalvos
                : []
        ).filter((participante) => {
            const origem = String(
                participante?.origem || ""
            )
                .trim()
                .toLowerCase();

            const tipo = String(
                participante?.tipo || ""
            )
                .trim()
                .toLowerCase();

            return (
                origem === "adicional" ||
                origem === "cadastro_adicional" ||
                tipo === "visitante" ||
                Boolean(participante?.idAdicional)
            );
        });

        const adicionaisSemLinha = adicionaisSalvos.filter(
            (participante) =>
                !Number(
                    participante?.linhaImpressa ||
                    participante?.numero ||
                    0
                )
        );

        return Array.from(
            { length: QUANTIDADE_LINHAS_COMPLEMENTARES_DDS },
            (_, indice) => {
                const numeroPadrao =
                    maiorNumeroBase + indice + 1;

                const salvoPorLinha = adicionaisSalvos.find(
                    (participante) =>
                        Number(
                            participante?.linhaImpressa ||
                            participante?.numero ||
                            0
                        ) === numeroPadrao
                );

                const salvo =
                    salvoPorLinha ||
                    adicionaisSemLinha[indice] ||
                    {};

                const linhaSalva = Number(
                    salvo?.linhaImpressa ||
                    salvo?.numero ||
                    0
                );

                const numero =
                    linhaSalva > maiorNumeroBase
                        ? linhaSalva
                        : numeroPadrao;

                const colaboradorId = String(
                    salvo?.colaboradorId ||
                    salvo?.colaborador_id ||
                    ""
                );

                const codigoSafescan = String(
                    salvo?.codigoSafescan ||
                    salvo?.codigoFuncionario ||
                    salvo?.codigo_funcionario ||
                    ""
                );

                const origem = String(
                    salvo?.origem ||
                    (
                        colaboradorId ||
                        codigoSafescan
                            ? "cadastro_adicional"
                            : "adicional"
                    )
                );

                const tipo = String(
                    salvo?.tipo ||
                    (
                        origem === "cadastro_adicional"
                            ? "colaborador"
                            : "visitante"
                    )
                );

                return {
                    idAdicional:
                        salvo?.idAdicional ||
                        "adicional-dds-" + numero,
                    numero,
                    linhaImpressa: numero,
                    nome: String(salvo?.nome || ""),
                    funcao: String(salvo?.funcao || ""),
                    empresa: String(
                        salvo?.empresa ||
                        salvo?.empresaNome ||
                        ""
                    ),
                    colaboradorId,
                    colaboradorCadastroChave: String(
                        salvo?.colaboradorCadastroChave ||
                        codigoSafescan ||
                        colaboradorId ||
                        ""
                    ),
                    codigoSafescan,
                    origem,
                    tipo,
                    status: "manual",
                };
            }
        );
    }

    const CHAVE_LOCAL_CARDS_DDS = "controle-sst-qr:dds:cards-recolhiveis:v1";

    const CARDS_DDS_PADRAO = {
        qr: true,
        novo: true,
        temas: true,
        qrConferencia: true,
        transcricao: false,
        preConferencia: false,
        conferenciaFrequencia: false,
        registroLocalizado: false,
        resultadoOficial: false,
        recibo: false,
        linhaTempo: false,
        controleMaoObra: false,
        historicoMaoObra: false,
        recados: true,
        orientacoes: true,
        preview: true,
    };

    function carregarCardsDdsLocal() {
        if (typeof window === "undefined") return { ...CARDS_DDS_PADRAO };

        try {
            const salvo = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_CARDS_DDS) || "{}");

            return {
                ...CARDS_DDS_PADRAO,
                ...(salvo && typeof salvo === "object" ? salvo : {}),
            };
        } catch {
            return { ...CARDS_DDS_PADRAO };
        }
    }

    function salvarCardsDdsLocal(cards = {}) {
        if (typeof window === "undefined") return;

        try {
            window.localStorage.setItem(CHAVE_LOCAL_CARDS_DDS, JSON.stringify({
                ...CARDS_DDS_PADRAO,
                ...(cards && typeof cards === "object" ? cards : {}),
            }));
        } catch {
            // Persistência visual não deve bloquear o DDS.
        }
    }

    const CHAVE_LOCAL_TEMAS_DDS = "controle-sst-qr:dds:temas-por-codigo:v1";

    function criarChaveTemasDdsLocal({ codigo = "" } = {}) {
        const codigoSeguro = String(codigo ?? "").trim();

        return codigoSeguro || "dds-temas-sem-codigo";
    }

    function normalizarTemasDdsEditaveis(temas = null) {
        const lista = Array.isArray(temas) ? temas : [];

        return diasDds.map((dia, indice) => {
            const item = lista[indice] && typeof lista[indice] === "object" ? lista[indice] : {};
            const temTema = Object.prototype.hasOwnProperty.call(item, "tema");
            const temResponsavel = Object.prototype.hasOwnProperty.call(item, "responsavel");

            return {
                tema: String(temTema ? item.tema : dia?.tema || "").trim(),
                responsavel: String(temResponsavel ? item.responsavel : dia?.responsavel || "").trim(),
            };
        });
    }

    function carregarTemasDdsLocal(chave = "") {
        if (typeof window === "undefined") return null;

        const chaveSegura = String(chave ?? "").trim();

        if (!chaveSegura) return null;

        try {
            const mapa = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_TEMAS_DDS) || "{}");
            const temasSalvos = mapa?.[chaveSegura];

            return Array.isArray(temasSalvos) ? normalizarTemasDdsEditaveis(temasSalvos) : null;
        } catch {
            return null;
        }
    }

    function salvarTemasDdsLocal(chave = "", temas = []) {
        if (typeof window === "undefined") return;

        const chaveSegura = String(chave ?? "").trim();

        if (!chaveSegura) return;

        try {
            const mapa = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_TEMAS_DDS) || "{}");

            mapa[chaveSegura] = normalizarTemasDdsEditaveis(temas);
            window.localStorage.setItem(CHAVE_LOCAL_TEMAS_DDS, JSON.stringify(mapa));
        } catch {
            // Persistência local não deve bloquear a impressão do DDS.
        }
    }

    const ORIENTACOES_PADRAO_DDS = [
        "Use sempre seus EPIs adequadamente.",
        "Siga os procedimentos e ordens de serviço.",
        "Mantenha o canteiro limpo e organizado.",
        "Em caso de dúvida, pare e pergunte.",
        "Segurança é responsabilidade de todos!",
        "Comunique imediatamente qualquer condição insegura.",
    ];

    const CHAVE_LOCAL_ORIENTACOES_DDS = "controle-sst-qr:dds:orientacoes-por-codigo:v1";

    function criarOrientacoesPadraoDds() {
        return ORIENTACOES_PADRAO_DDS.map((orientacao) => String(orientacao || "").trim());
    }

    function normalizarOrientacoesDdsLocal(orientacoes = null) {
        const lista = Array.isArray(orientacoes) ? orientacoes : [];

        return Array.from({ length: 6 }, (_, indice) => (
            Object.prototype.hasOwnProperty.call(lista, indice)
                ? String(lista[indice] ?? "").trim()
                : String(ORIENTACOES_PADRAO_DDS[indice] || "").trim()
        ));
    }

    function carregarOrientacoesDdsLocal(chave = "") {
        if (typeof window === "undefined") return null;

        const chaveSegura = String(chave ?? "").trim();

        if (!chaveSegura) return null;

        try {
            const mapa = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_ORIENTACOES_DDS) || "{}");
            const orientacoesSalvas = mapa?.[chaveSegura];

            return Array.isArray(orientacoesSalvas) ? normalizarOrientacoesDdsLocal(orientacoesSalvas) : null;
        } catch {
            return null;
        }
    }

    function salvarOrientacoesDdsLocal(chave = "", orientacoes = []) {
        if (typeof window === "undefined") return;

        const chaveSegura = String(chave ?? "").trim();

        if (!chaveSegura) return;

        try {
            const mapa = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_ORIENTACOES_DDS) || "{}");

            mapa[chaveSegura] = normalizarOrientacoesDdsLocal(orientacoes);
            window.localStorage.setItem(CHAVE_LOCAL_ORIENTACOES_DDS, JSON.stringify(mapa));
        } catch {
            // Persistência local não deve bloquear a impressão do DDS.
        }
    }
    const CHAVE_LOCAL_RECADOS_DDS = "controle-sst-qr:dds:recados-por-codigo:v1";

    function normalizarRecadosDdsLocal(valor = "") {
        return String(valor ?? "").replace(/\r\n/g, "\n").trimEnd();
    }

    function carregarRecadosDdsLocal(chave = "") {
        if (typeof window === "undefined") return "";

        const chaveSegura = String(chave ?? "").trim();

        if (!chaveSegura) return "";

        try {
            const mapa = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_RECADOS_DDS) || "{}");
            const recadoSalvo = mapa?.[chaveSegura];

            return typeof recadoSalvo === "string" ? normalizarRecadosDdsLocal(recadoSalvo) : "";
        } catch {
            return "";
        }
    }

    function salvarRecadosDdsLocal(chave = "", valor = "") {
        if (typeof window === "undefined") return;

        const chaveSegura = String(chave ?? "").trim();

        if (!chaveSegura) return;

        try {
            const mapa = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_RECADOS_DDS) || "{}");

            mapa[chaveSegura] = normalizarRecadosDdsLocal(valor);
            window.localStorage.setItem(CHAVE_LOCAL_RECADOS_DDS, JSON.stringify(mapa));
        } catch {
            // Persistência local não deve bloquear a impressão do DDS.
        }
    }
    function resolverLogoEmpresaDds(valor = "") {
        const texto = String(valor ?? "").trim();

        if (!texto) return "";

        if (/^(https?:|data:|blob:|\/)/i.test(texto)) {
            return texto;
        }

        return obterUrlLogoEmpresa(texto);
    }

    function obterLogoEmpresaSelecionadaDds({ empresaSelecionada = null, colaboradoresEmpresa = [], dadosDds = {} } = {}) {
        const colaboradores = Array.isArray(colaboradoresEmpresa) ? colaboradoresEmpresa : [];
        const colaboradorComLogo = colaboradores.find((colaborador) =>
            String(colaborador?.empresaLogoUrl || colaborador?.logo_url || colaborador?.logoUrl || "").trim()
        );

        const candidatos = [
            empresaSelecionada?.logo_url,
            empresaSelecionada?.logoUrl,
            empresaSelecionada?.empresaLogoUrl,
            empresaSelecionada?.logoAtual,
            dadosDds?.empresaLogoUrl,
            colaboradorComLogo?.empresaLogoUrl,
            colaboradorComLogo?.logo_url,
            colaboradorComLogo?.logoUrl,
        ];

        const caminhoLogo = candidatos.find((valor) => String(valor ?? "").trim());

        return resolverLogoEmpresaDds(caminhoLogo || "");
    }

    function normalizarTextoEmpresaDds(valor = "") {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function obterLogoRawEmpresaDds(empresa = null) {
        return (
            empresa?.logo_url ||
            empresa?.logoUrl ||
            empresa?.empresaLogoUrl ||
            empresa?.logoAtual ||
            ""
        );
    }

    function empresaEhIdealizarCidadesDds(empresa = null) {
        const nome = normalizarTextoEmpresaDds(empresa?.nome);
        const tipo = normalizarTextoEmpresaDds(empresa?.tipo_empresa || empresa?.tipoEmpresa);

        return nome.includes("idealiz") || tipo.includes("idealiz");
    }

    function obterEmpresaPorIdDds(empresas = [], id = "") {
        const idSeguro = String(id ?? "").trim();
        if (!idSeguro) return null;

        return (Array.isArray(empresas) ? empresas : []).find((empresa) =>
            String(empresa?.id ?? "").trim() === idSeguro
        ) || null;
    }

    function obterEmpresaContratanteDds({ empresaSelecionada = null, empresasDds = [] } = {}) {
        const empresas = Array.isArray(empresasDds) ? empresasDds.filter(Boolean) : [];
        const paiDireto = obterEmpresaPorIdDds(
            empresas,
            empresaSelecionada?.empresa_pai_id || empresaSelecionada?.empresaPaiId || ""
        );
        const avo = obterEmpresaPorIdDds(
            empresas,
            paiDireto?.empresa_pai_id || paiDireto?.empresaPaiId || ""
        );

        if (empresaEhIdealizarCidadesDds(empresaSelecionada)) return empresaSelecionada;
        if (empresaEhIdealizarCidadesDds(paiDireto)) return paiDireto;
        if (empresaEhIdealizarCidadesDds(avo)) return avo;

        return empresas.find(empresaEhIdealizarCidadesDds) || paiDireto || null;
    }

    function adicionarLogoEmpresaCabecalhoDds(lista = [], empresa = null) {
        const logoUrl = resolverLogoEmpresaDds(obterLogoRawEmpresaDds(empresa));

        if (!logoUrl) return lista;

        const chave = String(empresa?.id || empresa?.nome || logoUrl || "").trim();

        if (lista.some((item) => item.chave === chave || item.logoUrl === logoUrl)) {
            return lista;
        }

        return [
            ...lista,
            {
                chave,
                logoUrl,
            },
        ];
    }

    function obterLogosEmpresasCabecalhoDds({ empresaSelecionada = null, empresasDds = [] } = {}) {
        const empresas = Array.isArray(empresasDds) ? empresasDds.filter(Boolean) : [];
        const paiDireto = obterEmpresaPorIdDds(
            empresas,
            empresaSelecionada?.empresa_pai_id || empresaSelecionada?.empresaPaiId || ""
        );
        const avo = obterEmpresaPorIdDds(
            empresas,
            paiDireto?.empresa_pai_id || paiDireto?.empresaPaiId || ""
        );
        const empresaIdealiza = [
            empresaSelecionada,
            paiDireto,
            avo,
            ...empresas,
        ]
            .filter(Boolean)
            .find(empresaEhIdealizarCidadesDds) || null;

        let logos = [];

        logos = adicionarLogoEmpresaCabecalhoDds(
            logos,
            empresaIdealiza
        );

        if (
            empresaSelecionada &&
            !empresaEhIdealizarCidadesDds(empresaSelecionada)
        ) {
            logos = adicionarLogoEmpresaCabecalhoDds(
                logos,
                empresaSelecionada
            );
        }

        if (logos.length === 0 && empresaSelecionada) {
            logos = adicionarLogoEmpresaCabecalhoDds(
                logos,
                empresaSelecionada
            );
        }

        return logos.slice(0, 2);
    }

    function normalizarTextoTemaDds(valor = "") {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase();
    }

    function temaDdsSemAtividade(dia = {}) {
        const tema = normalizarTextoTemaDds(dia?.tema);

        return tema === "NAO HOUVE ATIVIDADES";
    }

    function obterDataNascimentoColaboradorDds(colaborador = {}) {
        return (
            colaborador?.dataNascimento ||
            colaborador?.data_nascimento ||
            colaborador?.nascimento ||
            colaborador?.dt_nascimento ||
            colaborador?.data_de_nascimento ||
            colaborador?.data_aniversario ||
            colaborador?.dataAniversario ||
            colaborador?.aniversario ||
            ""
        );
    }

    function extrairDiaMesNascimentoDds(valor = "") {
        const texto = String(valor ?? "").trim();

        if (!texto) return null;

        const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) {
            return {
                dia: Number(iso[3]),
                mes: Number(iso[2]),
            };
        }

        const br = texto.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-]\d{2,4})?/);
        if (br) {
            return {
                dia: Number(br[1]),
                mes: Number(br[2]),
            };
        }

        return null;
    }

    function limparHoraDataDds(data) {
        const limpa = new Date(data);
        limpa.setHours(0, 0, 0, 0);
        return limpa;
    }

    function formatarDiaMesDds(data) {
        const dia = String(data.getDate()).padStart(2, "0");
        const mes = String(data.getMonth() + 1).padStart(2, "0");

        return `${dia}/${mes}`;
    }

    function colaboradorDeveAparecerAniversarioDds(colaborador = {}) {
        return (
            colaborador?.mostrarAniversarioDashboard !== false &&
            colaborador?.mostrar_aniversario_dashboard !== false
        );
    }

    function montarAniversariantesSemanaDds({ colaboradores = [], inicioSemana = new Date(), fimSemana = new Date() } = {}) {
        const lista = Array.isArray(colaboradores) ? colaboradores : [];
        const inicio = limparHoraDataDds(inicioSemana);
        const fim = limparHoraDataDds(fimSemana);
        const anoInicial = inicio.getFullYear();
        const anosPossiveis = Array.from(new Set([anoInicial, fim.getFullYear(), anoInicial + 1]));

        return lista
            .filter(colaboradorDeveAparecerAniversarioDds)
            .map((colaborador) => {
                const dataNascimento = extrairDiaMesNascimentoDds(obterDataNascimentoColaboradorDds(colaborador));

                if (!dataNascimento?.dia || !dataNascimento?.mes) return null;

                const dataAniversario = anosPossiveis
                    .map((ano) => limparHoraDataDds(new Date(ano, dataNascimento.mes - 1, dataNascimento.dia)))
                    .find((data) => data >= inicio && data <= fim);

                if (!dataAniversario) return null;

                return {
                    data: formatarDiaMesDds(dataAniversario),
                    nome: String(colaborador?.nome || colaborador?.nomeCompleto || colaborador?.colaborador || "").trim(),
                    ordem: dataAniversario.getTime(),
                };
            })
            .filter((item) => item?.nome)
            .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
            .slice(0, 5)
            .map(({ data, nome }) => ({ data, nome }));
    }

    function obterUuidSeguroDds(valor = "") {
        const texto = String(valor || "").trim();
        const encontrado = texto.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);

        return encontrado ? encontrado[0].toLowerCase() : "";
    }

    return {
        diasDds,
        criarTemasEditaveisDds,
        participantesDds,
        participantesDdsContinuacao,
        LIMITE_PARTICIPANTES_PRIMEIRA_FOLHA_DDS,
        LIMITE_PARTICIPANTES_FOLHA_CONTINUACAO_DDS,
        QUANTIDADE_LINHAS_COMPLEMENTARES_DDS,
        aniversariantesDds,
        carregarObrasSetorDdsPorEmpresa,
        salvarObrasSetorDdsPorEmpresa,
        carregarFiscalIdealizaDdsPorEmpresa,
        salvarFiscalIdealizaDdsPorEmpresa,
        carregarEmpresaSelecionadaDds,
        salvarEmpresaSelecionadaDds,
        obterIdEmpresaObjetoDds,
        obterObraBaseDds,
        obterEmpresaIdObraDds,
        obterIdObraEmpresaDds,
        obterNomeObraEmpresaDds,
        obterFiscalObraEmpresaDds,
        obterLiderObraEmpresaDds,
        obterChaveEmpresaDds,
        filtrarColaboradoresPorEmpresaDds,
        adicionarDiasDds,
        obterInicioSemanaDds,
        obterFimSemanaDds,
        gerarDiasSemanaDds,
        normalizarTextoCodigoDds,
        obterNomeEmpresaObjetoDds,
        montarDadosDdsAutomaticos,
        dadosDdsPadrao,
        camposDadosDds,
        obterValorTextoDds,
        formatarResponsavelCabecalhoDds,
        normalizarParticipantesDdsSistema,
        montarFolhasDdsComLinhasComplementares,
        criarParticipantesAdicionaisConferenciaDds,
        CARDS_DDS_PADRAO,
        carregarCardsDdsLocal,
        salvarCardsDdsLocal,
        criarChaveTemasDdsLocal,
        normalizarTemasDdsEditaveis,
        carregarTemasDdsLocal,
        salvarTemasDdsLocal,
        criarOrientacoesPadraoDds,
        normalizarOrientacoesDdsLocal,
        carregarOrientacoesDdsLocal,
        salvarOrientacoesDdsLocal,
        carregarRecadosDdsLocal,
        salvarRecadosDdsLocal,
        resolverLogoEmpresaDds,
        obterLogoEmpresaSelecionadaDds,
        obterLogoRawEmpresaDds,
        obterEmpresaContratanteDds,
        obterLogosEmpresasCabecalhoDds,
        normalizarTextoTemaDds,
        temaDdsSemAtividade,
        montarAniversariantesSemanaDds,
        obterUuidSeguroDds,
    };
}
