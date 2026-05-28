/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardRecolhivel } from "../commonComponents";
import { FileUploadAviso, validarArquivoAntesUpload } from "../FileUploadAviso";
import {
    obterCategoriaPadronizadaAuditoriaCampo,
    obterTipoAuditoriaCampoPorParametro,
    obterTipoAuditoriaCampoDireta,
    checklistParaTipoAuditoriaCampo,
    criarRespostasChecklistDinamico,
    calcularResultadoChecklistDinamico,
    montarMensagemFluidaAuditoriaCampo,
    rotuloPontuacaoAuditoriaCampo,
    normalizarAuditoriaCampo,
} from "../../services/auditoriaCampoService";
import {
    respostasAuditoriaCampo,
    tiposAuditoriaCampoDireta,
    categoriasPadronizadasAuditoriaCampo,
    statusAuditoriaCampoDireta,
    grausRiscoAuditoriaCampoDireta,
    descricoesGrauRiscoAuditoriaCampoDireta,
} from "../../constants/sstConstants";
import { reduzirFotoParaAuditoria } from "../../services/imagemService";
import {
    normalizarTextoBusca,
    classNames,
    obterParametroUrl,
    sanitizarNomeArquivo,
} from "../../utils/sstUtils";
import { QRCodeSVG } from "qrcode.react";
import {
    ClipboardCheck,
    Lock,
    Mail,
    MessageCircle,
    QrCode,
    ShieldCheck,
    Upload,
} from "lucide-react";

const TOKEN_AUDITORIA_CAMPO_PUBLICA_PADRAO = "TOKEN-AUDITORIA-CAMPO-2026";

export function NovaAuditoriaCampoDireta({ usuario = null, onAuditoriaSalva, empresasBanco = [] }) {
    const parametros = (() => {
        if (typeof window === "undefined") return new URLSearchParams("");

        const parametrosNormais = new URLSearchParams(window.location.search || "");
        const hash = window.location.hash || "";
        const indiceConsultaHash = hash.indexOf("?");

        if (indiceConsultaHash >= 0) {
            const queryHash = hash.slice(indiceConsultaHash + 1);
            const parametrosHash = new URLSearchParams(queryHash);

            parametrosNormais.forEach((valor, chave) => {
                if (!parametrosHash.has(chave)) {
                    parametrosHash.set(chave, valor);
                }
            });

            return parametrosHash;
        }

        return parametrosNormais;
    })();
    const tipoParametro = parametros.get("tipo") || parametros.get("tipo_auditoria") || "area";
    const identificacaoParametro = parametros.get("id") || parametros.get("maquina") || parametros.get("equipamento") || "";
    const areaParametro = parametros.get("area") || "";
    const localParametro = parametros.get("local") || "";
    const empresaParametro = parametros.get("empresa") || parametros.get("empresa_responsavel") || "";
    const subareaParametro = parametros.get("subarea") || "";
    const tokenParametro = parametros.get("token") || parametros.get("chave") || "";
    const tipoInicial = obterTipoAuditoriaCampoPorParametro(tipoParametro);
    const origem = typeof window !== "undefined" ? window.location.origin : "";
    const tokenLinkAuditoriaCampo = tokenParametro || TOKEN_AUDITORIA_CAMPO_PUBLICA_PADRAO;
    const montarLinkAuditoriaCampo = (parametrosExtras = {}) => {
        const params = new URLSearchParams();

        if (tokenLinkAuditoriaCampo) {
            params.set("token", tokenLinkAuditoriaCampo);
        }

        Object.entries(parametrosExtras).forEach(([chave, valor]) => {
            if (valor !== undefined && valor !== null && String(valor).trim() !== "") {
                params.set(chave, String(valor));
            }
        });

        const consulta = params.toString();
        return `${origem}/#/auditoria-campo${consulta ? `?${consulta}` : ""}`;
    };
    const linkGeral = montarLinkAuditoriaCampo();
    const linkGeralDireto = linkGeral;
    const empresasAuditoriaCampo = useMemo(() => {
        const normalizarNomeEmpresa = (valor) => String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();

        const mapa = new Map();
        (empresasBanco || []).forEach((empresa) => {
            if (!empresa?.nome) return;
            const chave = normalizarNomeEmpresa(empresa.nome);
            if (!mapa.has(chave)) mapa.set(chave, empresa);
        });

        return Array.from(mapa.values())
            .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
    }, [empresasBanco]);


    const tokenAuditoriaPublicaInformado = Boolean(tokenParametro);
    const [senhaAcessoAuditoria, setSenhaAcessoAuditoria] = useState("");
    const [acessoAuditoriaValidado, setAcessoAuditoriaValidado] = useState(() => Boolean(usuario));
    const [validandoAcessoAuditoria, setValidandoAcessoAuditoria] = useState(false);
    const [mensagemAcessoAuditoria, setMensagemAcessoAuditoria] = useState("");
    const acessoLiberado = Boolean(usuario) || (tokenAuditoriaPublicaInformado && acessoAuditoriaValidado);
    const mensagemAcesso = tokenParametro ? "" : "Link inválido. Informe um token público de auditoria na URL.";
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState("");
    const [auditoriaSalva, setAuditoriaSalva] = useState(null);
    const [previewFotos, setPreviewFotos] = useState({ antes: "", depois: "" });
    const [formulario, setFormulario] = useState(() => ({
        tipoAuditoria: tipoInicial.valor,
        categoriaAuditoria: "isolamento",
        titulo: identificacaoParametro ? `Auditoria de campo - ${tipoInicial.label} ${identificacaoParametro}` : `Auditoria de campo - ${tipoInicial.label}`,
        area: areaParametro,
        subarea: subareaParametro,
        local: localParametro,
        maquinaEquipamento: identificacaoParametro,
        empresaResponsavel: empresaParametro,
        auditorNome: "",
        grauRisco: "Baixo",
        situacaoEncontrada: "",
        acaoRecomendada: "",
        responsavelTratativa: "",
        emailResponsavel: "",
        whatsappResponsavel: "",
        nomeTstResponsavel: "",
        emailTstResponsavel: "",
        whatsappTstResponsavel: "",
        prazoAdequacao: "",
        statusAuditoria: "Aberta",
        fotoAntes: null,
        fotoDepois: null,
        observacoesGerais: "",
    }));
    const [respostasChecklist, setRespostasChecklist] = useState(() => criarRespostasChecklistDinamico(tipoInicial.valor));

    useEffect(() => {
        if (usuario) {
            setAcessoAuditoriaValidado(true);
            setMensagemAcessoAuditoria("");
            return;
        }

        setAcessoAuditoriaValidado(false);
        setSenhaAcessoAuditoria("");
        setMensagemAcessoAuditoria("");
    }, [usuario, tokenParametro]);

    const validarSenhaAuditoriaPublica = async (evento) => {
        evento?.preventDefault?.();

        if (!tokenParametro) {
            setMensagemAcessoAuditoria("Token público da auditoria não informado na URL.");
            return;
        }

        if (!senhaAcessoAuditoria.trim()) {
            setMensagemAcessoAuditoria("Informe a senha de acesso da auditoria.");
            return;
        }

        setValidandoAcessoAuditoria(true);
        setMensagemAcessoAuditoria("");

        try {
            const { data, error } = await supabase.rpc("validar_acesso_auditoria_publica", {
                p_token: tokenParametro,
                p_senha: senhaAcessoAuditoria.trim(),
            });

            if (error) {
                throw error;
            }

            const autorizado = Boolean(data?.autorizado || data?.ok === true);

            if (!autorizado) {
                setAcessoAuditoriaValidado(false);
                setMensagemAcessoAuditoria(data?.mensagem || "Senha inválida ou token público inativo.");
                return;
            }

            setAcessoAuditoriaValidado(true);
            setMensagemAcessoAuditoria("");
        } catch (error) {
            setAcessoAuditoriaValidado(false);
            setMensagemAcessoAuditoria(error?.message || "Erro ao validar senha da auditoria.");
        } finally {
            setValidandoAcessoAuditoria(false);
        }
    };


    const nomeEmpresaAtualAuditoria = String(formulario.empresaResponsavel || empresaParametro || "").trim();
    const nomeEmpresaAtualNormalizado = normalizarTextoBusca(nomeEmpresaAtualAuditoria).trim();

    const empresaSelecionadaAuditoria = nomeEmpresaAtualNormalizado
        ? empresasAuditoriaCampo.find((empresa) =>
            normalizarTextoBusca(empresa.nome).trim() === nomeEmpresaAtualNormalizado
        ) || null
        : null;

    const contatosEmpresaAuditoria = empresaSelecionadaAuditoria
        ? {
            responsavel: empresaSelecionadaAuditoria.responsavel_auditoria || empresaSelecionadaAuditoria.responsavel || "",
            email: empresaSelecionadaAuditoria.email_auditoria || empresaSelecionadaAuditoria.email || "",
            whatsapp: empresaSelecionadaAuditoria.whatsapp_auditoria || empresaSelecionadaAuditoria.telefone || "",
            tstResponsavel: empresaSelecionadaAuditoria.tst_responsavel || "",
            tstEmail: empresaSelecionadaAuditoria.tst_email || "",
            tstWhatsapp: empresaSelecionadaAuditoria.tst_whatsapp || "",
        }
        : {
            responsavel: "",
            email: "",
            whatsapp: "",
            tstResponsavel: "",
            tstEmail: "",
            tstWhatsapp: "",
        };

    const tipoAtual = obterTipoAuditoriaCampoDireta(formulario.tipoAuditoria);
    const categoriaAtual = obterCategoriaPadronizadaAuditoriaCampo(formulario.categoriaAuditoria);
    const checklistAtual = useMemo(() => checklistParaTipoAuditoriaCampo(formulario.tipoAuditoria), [formulario.tipoAuditoria]);
    const resultado = useMemo(() => calcularResultadoChecklistDinamico(respostasChecklist), [respostasChecklist]);
    const linkTipoAtual = montarLinkAuditoriaCampo({
        tipo: tipoAtual.parametros[0] || tipoAtual.valor,
    });
    const linkEspecifico = formulario.maquinaEquipamento
        ? montarLinkAuditoriaCampo({
            tipo: tipoAtual.parametros[0] || tipoAtual.valor,
            id: formulario.maquinaEquipamento,
        })
        : linkTipoAtual;

    const textoNotificacaoResponsavel = useMemo(() => {
        return [
            `Auditoria de campo: ${formulario.titulo || "Sem título"}`,
            `Tipo: ${tipoAtual.label}`,
            `Empresa responsável: ${formulario.empresaResponsavel || "Não informada"}`,
            `Área: ${formulario.area || "Não informada"}`,
            `Local: ${formulario.local || "Não informado"}`,
            `Grau de risco: ${formulario.grauRisco}`,
            `Status: ${formulario.statusAuditoria}`,
            `Auditor: ${formulario.auditorNome || "Não informado"}`,
            "",
            `Situação encontrada: ${formulario.situacaoEncontrada || "Não informada"}`,
            `Ação recomendada: ${formulario.acaoRecomendada || "Não informada"}`,
            `Responsável pela tratativa: ${formulario.responsavelTratativa || "Não informado"}`,
            `Prazo: ${formulario.prazoAdequacao || "Não informado"}`,
        ].join("\n");
    }, [formulario, tipoAtual.label]);

    const assuntoNotificacaoResponsavel = `Auditoria de campo - ${formulario.grauRisco || "Risco"} - ${formulario.titulo || tipoAtual.label}`;
    const emailResponsavelAuditoria = String(formulario.emailResponsavel || "").trim();
    const whatsappResponsavelAuditoria = String(formulario.whatsappResponsavel || "").replace(/\D/g, "");
    const whatsappResponsavelFormatado = whatsappResponsavelAuditoria
        ? (whatsappResponsavelAuditoria.startsWith("55") ? whatsappResponsavelAuditoria : `55${whatsappResponsavelAuditoria}`)
        : "";
    const linkEmailResponsavel = emailResponsavelAuditoria
        ? `mailto:${emailResponsavelAuditoria}?subject=${encodeURIComponent(assuntoNotificacaoResponsavel)}&body=${encodeURIComponent(textoNotificacaoResponsavel)}`
        : "";
    const linkWhatsappResponsavel = whatsappResponsavelFormatado
        ? `https://wa.me/${whatsappResponsavelFormatado}?text=${encodeURIComponent(textoNotificacaoResponsavel)}`
        : "";

    const emailTstAuditoria = String(formulario.emailTstResponsavel || contatosEmpresaAuditoria.tstEmail || "").trim();
    const whatsappTstAuditoria = String(formulario.whatsappTstResponsavel || contatosEmpresaAuditoria.tstWhatsapp || "").replace(/\D/g, "");
    const whatsappTstFormatado = whatsappTstAuditoria
        ? (whatsappTstAuditoria.startsWith("55") ? whatsappTstAuditoria : `55${whatsappTstAuditoria}`)
        : "";
    const linkEmailTstAuditoria = emailTstAuditoria
        ? `mailto:${emailTstAuditoria}?subject=${encodeURIComponent(assuntoNotificacaoResponsavel)}&body=${encodeURIComponent(textoNotificacaoResponsavel)}`
        : "";
    const linkWhatsappTstAuditoria = whatsappTstFormatado
        ? `https://wa.me/${whatsappTstFormatado}?text=${encodeURIComponent(textoNotificacaoResponsavel)}`
        : "";

    const aplicarContatosEmpresaAuditoria = (nomeEmpresa) => {
        const nomeNormalizado = normalizarTextoBusca(nomeEmpresa).trim();

        const empresa = empresasAuditoriaCampo.find((item) =>
            normalizarTextoBusca(item.nome).trim() === nomeNormalizado
        );

        if (!empresa) {
            setFormulario((atual) => ({
                ...atual,
                empresaResponsavel: nomeEmpresa,
            }));
            return;
        }

        const emailAuditoria = empresa.email_auditoria || empresa.email || "";
        const whatsappAuditoria = empresa.whatsapp_auditoria || empresa.telefone || "";
        const responsavelAuditoria = empresa.responsavel_auditoria || empresa.responsavel || "";
        const tstResponsavel = empresa.tst_responsavel || "";
        const tstEmail = empresa.tst_email || "";
        const tstWhatsapp = empresa.tst_whatsapp || "";

        setFormulario((atual) => ({
            ...atual,
            empresaResponsavel: empresa.nome,
            responsavelTratativa: atual.responsavelTratativa || responsavelAuditoria,
            emailResponsavel: emailAuditoria || atual.emailResponsavel,
            whatsappResponsavel: whatsappAuditoria || atual.whatsappResponsavel,
            nomeTstResponsavel: tstResponsavel || atual.nomeTstResponsavel,
            emailTstResponsavel: tstEmail || atual.emailTstResponsavel,
            whatsappTstResponsavel: tstWhatsapp || atual.whatsappTstResponsavel,
        }));
    };

    const alterarFormulario = (campo, valor) => {
        setFormulario((atual) => ({ ...atual, [campo]: valor }));
    };

    const alterarEmpresaResponsavelAuditoria = (valor) => {
        aplicarContatosEmpresaAuditoria(valor);
    };

    useEffect(() => {
        if (!formulario.empresaResponsavel || !empresaSelecionadaAuditoria) return;
        if (formulario.emailResponsavel && formulario.whatsappResponsavel && formulario.emailTstResponsavel) return;

        const timer = window.setTimeout(() => {
            const nomeNormalizado = normalizarTextoBusca(formulario.empresaResponsavel).trim();

            const empresa = empresasAuditoriaCampo.find((item) =>
                normalizarTextoBusca(item.nome).trim() === nomeNormalizado
            );

            if (!empresa) return;

            const emailAuditoria = empresa.email_auditoria || empresa.email || "";
            const whatsappAuditoria = empresa.whatsapp_auditoria || empresa.telefone || "";
            const responsavelAuditoria = empresa.responsavel_auditoria || empresa.responsavel || "";
            const tstResponsavel = empresa.tst_responsavel || "";
            const tstEmail = empresa.tst_email || "";
            const tstWhatsapp = empresa.tst_whatsapp || "";

            setFormulario((atual) => ({
                ...atual,
                responsavelTratativa: atual.responsavelTratativa || responsavelAuditoria,
                emailResponsavel: emailAuditoria || atual.emailResponsavel,
                whatsappResponsavel: whatsappAuditoria || atual.whatsappResponsavel,
                nomeTstResponsavel: tstResponsavel || atual.nomeTstResponsavel,
                emailTstResponsavel: tstEmail || atual.emailTstResponsavel,
                whatsappTstResponsavel: tstWhatsapp || atual.whatsappTstResponsavel,
            }));
        }, 0);

        return () => window.clearTimeout(timer);
    }, [
        empresasAuditoriaCampo,
        empresaSelecionadaAuditoria,
        formulario.empresaResponsavel,
        formulario.emailResponsavel,
        formulario.whatsappResponsavel,
        formulario.emailTstResponsavel,
    ]);

    const alterarTipoAuditoria = (valor) => {
        const novoTipo = obterTipoAuditoriaCampoDireta(valor);
        setFormulario((atual) => ({
            ...atual,
            tipoAuditoria: novoTipo.valor,
            titulo: atual.titulo && !atual.titulo.startsWith("Auditoria de campo -") ? atual.titulo : `Auditoria de campo - ${novoTipo.label}`,
        }));
        setRespostasChecklist(criarRespostasChecklistDinamico(novoTipo.valor));
    };


    const limparFormularioAuditoriaCampo = () => {
        if (previewFotos.antes) URL.revokeObjectURL(previewFotos.antes);
        if (previewFotos.depois) URL.revokeObjectURL(previewFotos.depois);

        setFormulario({
            tipoAuditoria: tipoInicial.valor,
            categoriaAuditoria: "isolamento",
            titulo: identificacaoParametro ? `Auditoria de campo - ${tipoInicial.label} ${identificacaoParametro}` : `Auditoria de campo - ${tipoInicial.label}`,
            area: areaParametro,
            subarea: subareaParametro,
            local: localParametro,
            maquinaEquipamento: identificacaoParametro,
            empresaResponsavel: empresaParametro,
            auditorNome: "",
            grauRisco: "Baixo",
            situacaoEncontrada: "",
            acaoRecomendada: "",
            responsavelTratativa: "",
            emailResponsavel: "",
            whatsappResponsavel: "",
            nomeTstResponsavel: "",
            emailTstResponsavel: "",
            whatsappTstResponsavel: "",
            prazoAdequacao: "",
            statusAuditoria: "Aberta",
            fotoAntes: null,
            fotoDepois: null,
            observacoesGerais: "",
        });
        setRespostasChecklist(criarRespostasChecklistDinamico(tipoInicial.valor));
        setPreviewFotos({ antes: "", depois: "" });
        setAuditoriaSalva(null);
        setMensagem("Formulário limpo. Você pode iniciar uma nova auditoria.");
    };

    const copiarTexto = async (texto, sucesso = "Link copiado.") => {
        try {
            await navigator.clipboard.writeText(texto);
            setMensagem(sucesso);
        } catch {
            setMensagem("Não foi possível copiar automaticamente. Selecione e copie o link manualmente.");
        }
    };

    const alterarFoto = (campo, arquivo) => {
        if (arquivo && !String(arquivo.type || "").startsWith("image/")) {
            setMensagem("Anexe apenas fotos nos campos de evidência.");
            return;
        }

        setFormulario((atual) => ({ ...atual, [campo]: arquivo || null }));

        const previewCampo = campo === "fotoAntes" ? "antes" : "depois";
        if (previewFotos[previewCampo]) {
            URL.revokeObjectURL(previewFotos[previewCampo]);
        }
        setPreviewFotos((atual) => ({
            ...atual,
            [previewCampo]: arquivo ? URL.createObjectURL(arquivo) : "",
        }));
    };

    const gerarNumeroAuditoria = async () => {
        const { data, error } = await supabase.rpc("gerar_numero_auditoria_campo");
        if (!error && data) return data;
        const ano = new Date().getFullYear();
        return `AUD-${ano}-${String(Date.now()).slice(-4)}`;
    };

    const uploadFotoDireta = async (arquivo, numeroAuditoria, tipo) => {
        if (!arquivo) return "";
        const otimizada = await reduzirFotoParaAuditoria(arquivo, { maxLado: 1400, alvoBytes: 800 * 1024 });
        if (!validarArquivoAntesUpload(otimizada, "fotoAuditoria")) {
            throw new Error("A foto ficou acima do limite mesmo após a redução automática.");
        }
        const nomeSeguro = sanitizarNomeArquivo(otimizada.name || `${tipo}.jpg`);
        const caminho = `auditorias-publicas/${numeroAuditoria}/${tipo}-${Date.now()}-${nomeSeguro}`;
        const { error } = await supabase.storage.from("auditorias-campo").upload(caminho, otimizada, {
            cacheControl: "3600",
            upsert: true,
            contentType: otimizada.type || "image/jpeg",
        });
        if (error) throw new Error(`Erro ao enviar ${tipo}: ${error.message}`);
        return caminho;
    };

    const salvarAuditoriaDireta = async () => {
        if (!formulario.tipoAuditoria) {
            setMensagem("Selecione o tipo de auditoria.");
            return;
        }
        if (!formulario.titulo.trim()) {
            setMensagem("Informe o título/assunto da auditoria.");
            return;
        }
        if (!formulario.local.trim() && !formulario.area.trim() && !formulario.maquinaEquipamento.trim()) {
            setMensagem("Informe ao menos área, local ou máquina/equipamento.");
            return;
        }
        if (!formulario.situacaoEncontrada.trim()) {
            setMensagem("Descreva a situação encontrada.");
            return;
        }

        setSalvando(true);
        setMensagem("");

        try {
            const referenciaUploadFotos = `auditoria-pendente-${Date.now()}`;
            const fotoAntesUrl = await uploadFotoDireta(formulario.fotoAntes, referenciaUploadFotos, "foto-antes");
            const fotoDepoisUrl = await uploadFotoDireta(formulario.fotoDepois, referenciaUploadFotos, "foto-depois");
            const checklistDinamico = resultado.itens.map((item) => ({
                pergunta: item.pergunta,
                resposta: item.resposta.chave,
                respostaTexto: item.resposta.texto,
                pontos: item.resposta.pontos,
            }));

            const payload = {
                tipo_auditoria: formulario.tipoAuditoria,
                titulo: formulario.titulo.trim(),
                area: formulario.area.trim() || null,
                subarea: formulario.subarea.trim() || null,
                local: formulario.local.trim() || null,
                maquina_equipamento: formulario.maquinaEquipamento.trim() || null,
                empresa_responsavel: formulario.empresaResponsavel.trim() || null,
                empresa_nome: formulario.empresaResponsavel.trim() || null,
                auditor_nome: formulario.auditorNome.trim() || "Não informado",
                grau_risco: formulario.grauRisco,
                situacao_encontrada: formulario.situacaoEncontrada.trim(),
                acao_recomendada: formulario.acaoRecomendada.trim() || null,
                responsavel_tratativa: formulario.responsavelTratativa.trim() || null,
                prazo_adequacao: formulario.prazoAdequacao || null,
                status_auditoria: formulario.statusAuditoria,
                status_desvio: formulario.statusAuditoria === "Resolvida" ? "Corrigido" : "Aberto",
                foto_antes_url: fotoAntesUrl || null,
                foto_depois_url: fotoDepoisUrl || null,
                observacoes_gerais: formulario.observacoesGerais.trim() || null,
                observacao: formulario.observacoesGerais.trim() || formulario.situacaoEncontrada.trim(),
                checklist: checklistDinamico,
                checklist_dinamico: checklistDinamico,
                pontuacao: resultado.percentual ?? 0,
                classificacao: resultado.classificacao || "Sem avaliação",
                tem_desvio_grave: Boolean(resultado.temDesvioGrave),
                categoria_desvio_principal: categoriaAtual.label,
                total_desvios: ["Aberta", "Em andamento", "Vencida"].includes(formulario.statusAuditoria) ? 1 : 0,
                origem: "Link direto / auditoria-campo",
                token_qr: tokenParametro || null,
                notificacao: {
                    titulo: formulario.titulo.trim(),
                    mensagem: montarMensagemFluidaAuditoriaCampo({
                        numeroAuditoria: "Será gerado ao salvar",
                        tipoAuditoria: tipoAtual.label,
                        titulo: formulario.titulo.trim(),
                        area: formulario.area.trim(),
                        local: formulario.local.trim(),
                        maquinaEquipamento: formulario.maquinaEquipamento.trim(),
                        empresaResponsavel: formulario.empresaResponsavel.trim(),
                        auditorNome: formulario.auditorNome.trim() || "Não informado",
                        grauRisco: formulario.grauRisco,
                        classificacao: resultado.classificacao,
                        pontuacao: resultado.percentual ?? 0,
                        statusAuditoria: formulario.statusAuditoria,
                        responsavelTratativa: formulario.responsavelTratativa.trim(),
                        prazoAdequacao: formulario.prazoAdequacao,
                    }, { tipo: tipoAtual.label, titulo: formulario.titulo.trim() }),
                    auditor: formulario.auditorNome.trim() || "Não informado",
                    emailResponsavel: emailResponsavelAuditoria || null,
                    whatsappResponsavel: whatsappResponsavelFormatado || null,
                    nomeTstResponsavel: formulario.nomeTstResponsavel || contatosEmpresaAuditoria.tstResponsavel || null,
                    emailTstResponsavel: emailTstAuditoria || null,
                    whatsappTstResponsavel: whatsappTstFormatado || null,
                    textoEnvio: textoNotificacaoResponsavel,
                    complementos: formulario.acaoRecomendada ? [formulario.acaoRecomendada.trim()] : [],
                },
            };

            const tokenAuditoriaCampo = obterParametroUrl("token") || obterParametroUrl("chave");
            let data = null;

            if (tokenAuditoriaCampo) {
                const { data: dadosRpc, error } = await supabase.rpc("salvar_auditoria_campo_publica", {
                    p_token: tokenAuditoriaCampo,
                    p_dados: payload,
                });

                if (error) {
                    throw error;
                }

                data = dadosRpc;
            } else if (usuario) {
                const numeroAuditoriaInterna = await gerarNumeroAuditoria();
                const payloadInterno = {
                    ...payload,
                    empresa_id: empresaSelecionadaAuditoria?.id || null,
                    empresa_nome: payload.empresa_nome || empresaSelecionadaAuditoria?.nome || formulario.empresaResponsavel.trim() || null,
                    numero_auditoria: numeroAuditoriaInterna,
                    token_qr: null,
                    origem: "Auditoria interna / app autenticado",
                };

                const { data: auditoriaCriada, error: erroAuditoria } = await supabase
                    .from("auditorias_campo")
                    .insert(payloadInterno)
                    .select("*")
                    .single();

                if (erroAuditoria) {
                    throw erroAuditoria;
                }

                if (Number(payloadInterno.total_desvios || 0) > 0) {
                    const { error: erroDesvio } = await supabase
                        .from("auditoria_campo_desvios")
                        .insert({
                            auditoria_id: auditoriaCriada.id,
                            empresa_id: auditoriaCriada.empresa_id || payloadInterno.empresa_id || null,
                            categoria: payloadInterno.categoria_desvio_principal || "Auditoria de campo",
                            descricao: payloadInterno.situacao_encontrada || "Desvio registrado na auditoria de campo",
                            gravidade: payloadInterno.grau_risco || "Moderada",
                            acao_imediata: payloadInterno.acao_recomendada || null,
                            responsavel: payloadInterno.responsavel_tratativa || null,
                            prazo: payloadInterno.prazo_adequacao || null,
                            status: payloadInterno.status_desvio || "Aberto",
                            foto_antes_url: payloadInterno.foto_antes_url || null,
                            foto_depois_url: payloadInterno.foto_depois_url || null,
                            observacao: payloadInterno.observacao || null,
                            notificacao: payloadInterno.notificacao || {},
                            observacao_aberto: payloadInterno.observacoes_gerais || null,
                        });

                    if (erroDesvio) {
                        throw erroDesvio;
                    }
                }

                data = {
                    ok: true,
                    id: auditoriaCriada.id,
                    numero_auditoria: auditoriaCriada.numero_auditoria || numeroAuditoriaInterna,
                    empresa_id: auditoriaCriada.empresa_id || payloadInterno.empresa_id || null,
                    token_validado_no_supabase: false,
                    auditoria_interna_autenticada: true,
                };
            } else {
                throw new Error("Token da auditoria não informado. Acesse o formulário por um link público com token cadastrado no Supabase.");
            }

            const numeroGerado = data?.numero_auditoria || referenciaUploadFotos;
            const idGerado = data?.id || null;

            const normalizada = normalizarAuditoriaCampo({
                ...payload,
                id: idGerado,
                numero_auditoria: numeroGerado,
                criado_em: new Date().toISOString(),
                auditoria_campo_desvios: [],
                desvios: [],
            });
            setAuditoriaSalva(normalizada);
            setMensagem(`Auditoria ${numeroGerado} salva com sucesso.`);
            if (onAuditoriaSalva) onAuditoriaSalva(normalizada);
        } catch (error) {
            setMensagem(error.message || "Erro ao salvar auditoria de campo.");
        } finally {
            setSalvando(false);
        }
    };

    const renderCampoTexto = (campo, label, placeholder = "", type = "text") => (
        <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label>
            <input
                type={type}
                value={formulario[campo] || ""}
                onChange={(e) => alterarFormulario(campo, e.target.value)}
                placeholder={placeholder}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
        </div>
    );

    if (!usuario && !tokenAuditoriaPublicaInformado) {
        return (
            <div className="min-h-screen bg-slate-100 p-4 text-slate-900">
                <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl items-center justify-center">
                    <Card className="w-full">
                        <div className="text-center">
                            <ShieldCheck className="mx-auto h-10 w-10 text-red-600" />
                            <h1 className="mt-3 text-2xl font-black text-slate-950">Link inválido</h1>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                Abra o formulário por um link com token público ativo cadastrado no Supabase.
                            </p>
                        </div>
                        {mensagemAcesso && <p className="mt-6 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">{mensagemAcesso}</p>}
                    </Card>
                </div>
            </div>
        );
    }

    if (!usuario && tokenAuditoriaPublicaInformado && !acessoLiberado) {
        return (
            <div className="min-h-screen bg-slate-100 p-4 text-slate-900">
                <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl items-center justify-center">
                    <Card className="w-full overflow-hidden">
                        <div className="-m-5 mb-5 bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-center text-white">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 text-white ring-1 ring-white/10">
                                <Lock className="h-7 w-7" />
                            </div>
                            <h1 className="mt-4 text-2xl font-black">Acesso à auditoria</h1>
                            <p className="mt-2 text-sm leading-relaxed text-slate-300">
                                Informe a senha autorizada para abrir a Nova Auditoria de Campo.
                            </p>
                        </div>

                        <form onSubmit={validarSenhaAuditoriaPublica} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Senha da auditoria
                                </label>
                                <input
                                    type="password"
                                    value={senhaAcessoAuditoria}
                                    onChange={(e) => setSenhaAcessoAuditoria(e.target.value)}
                                    placeholder="Digite a senha de acesso"
                                    autoComplete="current-password"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            {mensagemAcessoAuditoria && (
                                <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                                    {mensagemAcessoAuditoria}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={validandoAcessoAuditoria}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <ShieldCheck className="h-4 w-4" />
                                {validandoAcessoAuditoria ? "Validando acesso..." : "Entrar na auditoria"}
                            </button>
                        </form>

                        <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100">
                            A consulta pública do QR do funcionário continua liberada sem senha. Esta senha protege somente a abertura da Nova Auditoria de Campo.
                        </p>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen overflow-x-hidden bg-slate-100 p-3 text-slate-900 sm:p-4 md:p-6">
            <div className="mx-auto w-full max-w-6xl space-y-5">
                <Card className="overflow-hidden border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/60">
                    <div className="flex min-w-0 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_180px] lg:items-center">
                        <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
                            <div className="shrink-0 rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                                <ClipboardCheck className="h-6 w-6" />
                            </div>
                            <div className="min-w-0 w-full">
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Link direto</p>
                                <h1 className="mt-1 text-2xl font-black leading-tight text-slate-950 md:text-3xl">Nova Auditoria de Campo</h1>
                                <p className="mx-auto mt-1 max-w-3xl text-sm leading-relaxed text-slate-500 sm:mx-0">
                                    Formulário rápido para áreas externas, pátios, frentes de serviço, máquinas, equipamentos ou locais sem QR Code específico.
                                </p>
                                <div className="mx-auto mt-4 flex w-full max-w-full min-w-0 flex-col gap-2 sm:mx-0 sm:max-w-3xl sm:flex-row sm:items-center">
                                    <div className="w-full min-w-0 overflow-hidden rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                                        <span className="block truncate">{linkGeral}</span>
                                    </div>
                                    <button type="button" onClick={() => copiarTexto(linkGeral, "Link geral copiado.")} className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 sm:w-auto">
                                        <QrCode className="h-4 w-4" />
                                        Copiar link geral
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="mx-auto w-full max-w-[220px] rounded-3xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200 lg:mx-0 lg:justify-self-end">
                            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-2xl bg-slate-50 p-2">
                                <QRCodeSVG value={linkGeral} size={112} level="M" />
                            </div>
                            <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">QR Code geral</p>
                        </div>
                    </div>
                </Card>

                <div className="grid gap-5">
                    <div className="space-y-5">
                        <CardRecolhivel titulo="Dados da auditoria" subtitulo="Preencha as informações principais da auditoria de campo." defaultOpen={false} persistKey="novaAuditoriaCampo:dados">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Tipo de auditoria</label>
                                    <select value={formulario.tipoAuditoria} onChange={(e) => alterarTipoAuditoria(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-300">
                                        {tiposAuditoriaCampoDireta.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.label}</option>)}
                                    </select>
                                </div>
                                {renderCampoTexto("titulo", "Título / assunto")}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Categoria padronizada</label>
                                    <select
                                        value={formulario.categoriaAuditoria}
                                        onChange={(e) => alterarFormulario("categoriaAuditoria", e.target.value)}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-300"
                                    >
                                        {categoriasPadronizadasAuditoriaCampo.map((categoria) => <option key={categoria.valor} value={categoria.valor}>{categoria.label}</option>)}
                                    </select>
                                    <p className="mt-1 text-[11px] text-slate-400">Padroniza a busca e os gráficos do banco de dados. Ex.: isolamento, organização de área ou máquina com defeito.</p>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Área</label>
                                        <button type="button" onClick={() => alterarFormulario("area", "Não aplicável")} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200">
                                            Não aplicável
                                        </button>
                                    </div>
                                    <input
                                        value={formulario.area || ""}
                                        onChange={(e) => alterarFormulario("area", e.target.value)}
                                        list="opcoes-area-auditoria-campo"
                                        placeholder="Ex.: Pátio de máquinas"
                                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Subárea</label>
                                        <button type="button" onClick={() => alterarFormulario("subarea", "Não aplicável")} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200">
                                            Não aplicável
                                        </button>
                                    </div>
                                    <input
                                        value={formulario.subarea || ""}
                                        onChange={(e) => alterarFormulario("subarea", e.target.value)}
                                        placeholder="Ex.: Linha 01 / doca / acesso lateral"
                                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Local</label>
                                        <button type="button" onClick={() => alterarFormulario("local", "Não aplicável")} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200">
                                            Não aplicável
                                        </button>
                                    </div>
                                    <input
                                        value={formulario.local || ""}
                                        onChange={(e) => alterarFormulario("local", e.target.value)}
                                        list="opcoes-local-auditoria-campo"
                                        placeholder="Descreva o local exato"
                                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Máquina / equipamento</label>
                                        <button type="button" onClick={() => alterarFormulario("maquinaEquipamento", "Não aplicável")} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200">
                                            Não aplicável
                                        </button>
                                    </div>
                                    <input
                                        value={formulario.maquinaEquipamento || ""}
                                        onChange={(e) => alterarFormulario("maquinaEquipamento", e.target.value)}
                                        placeholder="Ex.: PRENSA-01 ou Não aplicável"
                                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Empresa responsável</label>
                                    <select
                                        value={empresasAuditoriaCampo.some((empresa) => empresa.nome === formulario.empresaResponsavel) ? formulario.empresaResponsavel : ""}
                                        onChange={(e) => alterarEmpresaResponsavelAuditoria(e.target.value)}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-300"
                                    >
                                        <option value="">Selecionar empresa cadastrada</option>
                                        {empresasAuditoriaCampo.map((empresa) => (
                                            <option key={empresa.id || empresa.nome} value={empresa.nome}>{empresa.nome}</option>
                                        ))}
                                    </select>
                                    <input
                                        value={formulario.empresaResponsavel || ""}
                                        onChange={(e) => alterarFormulario("empresaResponsavel", e.target.value)}
                                        list="empresas-auditoria-campo"
                                        placeholder="Ou digite manualmente"
                                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                    <datalist id="empresas-auditoria-campo">
                                        {empresasAuditoriaCampo.map((empresa) => (
                                            <option key={empresa.id || empresa.nome} value={empresa.nome} />
                                        ))}
                                    </datalist>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        Ao selecionar uma empresa cadastrada, o app preenche automaticamente e-mail, WhatsApp e TST responsável quando esses dados existirem no cadastro.
                                    </p>
                                </div>
                                {renderCampoTexto("auditorNome", "Nome do auditor", "Quem está realizando a auditoria")}
                                <datalist id="opcoes-area-auditoria-campo">
                                    <option value="Não aplicável" />
                                    <option value="Geral" />
                                    <option value="Área externa" />
                                    <option value="Pátio de máquinas" />
                                    <option value="Frente de serviço" />
                                </datalist>
                                <datalist id="opcoes-local-auditoria-campo">
                                    <option value="Não aplicável" />
                                    <option value="Geral" />
                                    <option value="Obra toda" />
                                    <option value="Local móvel" />
                                    <option value="Frente de serviço" />
                                </datalist>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Grau de risco</label>
                                    <select value={formulario.grauRisco} onChange={(e) => alterarFormulario("grauRisco", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-300">
                                        {grausRiscoAuditoriaCampoDireta.map((risco) => <option key={risco}>{risco}</option>)}
                                    </select>
                                    <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500 ring-1 ring-slate-100">
                                        {descricoesGrauRiscoAuditoriaCampoDireta[formulario.grauRisco]}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Status da auditoria</label>
                                    <select value={formulario.statusAuditoria} onChange={(e) => alterarFormulario("statusAuditoria", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-300">
                                        {statusAuditoriaCampoDireta.map((status) => <option key={status}>{status}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Situação encontrada</label>
                                    <textarea value={formulario.situacaoEncontrada} onChange={(e) => alterarFormulario("situacaoEncontrada", e.target.value)} rows={3} placeholder="Descreva a condição encontrada durante a auditoria" className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Ação recomendada</label>
                                    <textarea value={formulario.acaoRecomendada} onChange={(e) => alterarFormulario("acaoRecomendada", e.target.value)} rows={3} placeholder="Descreva a ação recomendada para correção" className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Observações gerais</label>
                                    <textarea value={formulario.observacoesGerais} onChange={(e) => alterarFormulario("observacoesGerais", e.target.value)} rows={3} placeholder="Observações adicionais, se necessário" className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
                                </div>
                            </div>
                        </CardRecolhivel>

                        <CardRecolhivel titulo="Responsáveis e notificação" subtitulo="Dados de tratativa e contatos ficam recolhidos para não poluir a tela durante o preenchimento inicial." defaultOpen={false} persistKey="novaAuditoriaCampo:responsaveisNotificacao">
                            <div className="grid gap-4 md:grid-cols-2">
                                {renderCampoTexto("responsavelTratativa", "Responsável pela tratativa")}
                                {renderCampoTexto("prazoAdequacao", "Prazo para adequação", "", "date")}
                                {renderCampoTexto("emailResponsavel", "E-mail do responsável", "responsavel@empresa.com", "email")}
                                {renderCampoTexto("whatsappResponsavel", "WhatsApp do responsável", "Ex.: 12 99999-9999")}
                                {renderCampoTexto("nomeTstResponsavel", "TST responsável", "Nome do TST responsável")}
                                {renderCampoTexto("emailTstResponsavel", "E-mail do TST responsável", "tst@empresa.com", "email")}
                                {renderCampoTexto("whatsappTstResponsavel", "WhatsApp do TST responsável", "Ex.: 12 99999-9999")}
                                <div className="md:col-span-2 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <p className="text-sm font-black text-slate-900">Notificação ao responsável</p>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                                Use estes botões para enviar a tratativa por e-mail ou WhatsApp com as informações preenchidas na auditoria.
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            {linkEmailResponsavel ? (
                                                <a href={linkEmailResponsavel} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
                                                    <Mail className="h-4 w-4" />
                                                    Enviar e-mail
                                                </a>
                                            ) : (
                                                <button type="button" disabled className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-400 ring-1 ring-slate-200">
                                                    <Mail className="h-4 w-4" />
                                                    Enviar e-mail
                                                </button>
                                            )}
                                            {linkWhatsappResponsavel ? (
                                                <a href={linkWhatsappResponsavel} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                                                    <MessageCircle className="h-4 w-4" />
                                                    WhatsApp
                                                </a>
                                            ) : (
                                                <button type="button" disabled className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-300 ring-1 ring-emerald-100">
                                                    <MessageCircle className="h-4 w-4" />
                                                    WhatsApp
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <p className="text-sm font-black text-slate-900">Enviar também ao TST responsável</p>
                                                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                                    Use quando a tratativa precisar ser acompanhada pelo Técnico de Segurança cadastrado na empresa.
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                {linkEmailTstAuditoria ? (
                                                    <a href={linkEmailTstAuditoria} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
                                                        <Mail className="h-4 w-4" />
                                                        E-mail TST
                                                    </a>
                                                ) : (
                                                    <button type="button" disabled className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-400 ring-1 ring-slate-200">
                                                        <Mail className="h-4 w-4" />
                                                        E-mail TST
                                                    </button>
                                                )}
                                                {linkWhatsappTstAuditoria ? (
                                                    <a href={linkWhatsappTstAuditoria} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                                                        <MessageCircle className="h-4 w-4" />
                                                        WhatsApp TST
                                                    </a>
                                                ) : (
                                                    <button type="button" disabled className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-300 ring-1 ring-emerald-100">
                                                        <MessageCircle className="h-4 w-4" />
                                                        WhatsApp TST
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </CardRecolhivel>

                        <CardRecolhivel titulo={`Checklist dinâmico — ${tipoAtual.label}`} subtitulo="O checklist começa como não aplicável e o auditor altera apenas os itens avaliados." contador={`${resultado.classificacao} · ${resultado.percentual}%`} defaultOpen={false} persistKey="novaAuditoriaCampo:checklist">
                            <div className="grid gap-3 lg:grid-cols-2">
                                {checklistAtual.map((pergunta) => (
                                    <div key={pergunta} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                                        <p className="text-sm font-bold text-slate-800">{pergunta}</p>
                                        <select value={respostasChecklist[pergunta] || "nao_aplicavel"} onChange={(e) => setRespostasChecklist((atual) => ({ ...atual, [pergunta]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-300">
                                            {respostasAuditoriaCampo.map((resposta) => <option key={resposta.chave} value={resposta.chave}>{resposta.texto} — {rotuloPontuacaoAuditoriaCampo(resposta)}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </CardRecolhivel>

                        <CardRecolhivel titulo="Fotos da auditoria" subtitulo="Fotos grandes serão reduzidas automaticamente antes do envio." defaultOpen={false} persistKey="novaAuditoriaCampo:fotos">
                            <div className="grid gap-4 md:grid-cols-2">
                                {[
                                    { campo: "fotoAntes", preview: previewFotos.antes, label: "Foto antes" },
                                    { campo: "fotoDepois", preview: previewFotos.depois, label: "Foto depois" },
                                ].map((item) => (
                                    <div key={item.campo} className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
                                            <Upload className="h-4 w-4" />
                                            {formulario[item.campo]?.name || item.label}
                                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => alterarFoto(item.campo, e.target.files?.[0] || null)} />
                                        </label>
                                        <FileUploadAviso arquivo={formulario[item.campo]} tipo="fotoAuditoria" />
                                        {item.preview && <img src={item.preview} alt={item.label} className="mt-3 max-h-64 w-full rounded-2xl object-cover ring-1 ring-slate-200" />}
                                    </div>
                                ))}
                            </div>
                        </CardRecolhivel>
                    </div>
                </div>

                {mensagem && (
                    <div className={classNames("rounded-3xl p-4 text-sm font-bold ring-1", auditoriaSalva ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-blue-50 text-blue-700 ring-blue-100")}>
                        {mensagem}
                    </div>
                )}

                {auditoriaSalva && (
                    <Card className="border-emerald-200 bg-emerald-50">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Auditoria salva</p>
                                <h2 className="mt-1 text-xl font-black text-emerald-950">{auditoriaSalva.numeroAuditoria || auditoriaSalva.id}</h2>
                                <p className="mt-1 text-sm text-emerald-700">Ela já pode aparecer no Dashboard Auditoria de Campo e relatórios.</p>
                            </div>
                            <button type="button" onClick={limparFormularioAuditoriaCampo} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700">Nova auditoria</button>
                        </div>
                    </Card>
                )}

                <div className="flex flex-col gap-3 rounded-3xl bg-white/95 p-3 shadow-xl ring-1 ring-slate-200 backdrop-blur md:sticky md:bottom-4 md:z-10 md:flex-row">
                    <button type="button" onClick={salvarAuditoriaDireta} disabled={salvando} className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
                        {salvando ? "Salvando auditoria..." : "+ Salvar nova auditoria de campo"}
                    </button>
                    <button type="button" onClick={limparFormularioAuditoriaCampo} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 md:w-auto">
                        Nova auditoria / limpar formulário
                    </button>
                </div>
            </div>
        </div>
    );
}
