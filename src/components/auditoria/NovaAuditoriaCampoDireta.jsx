/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from "react";
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
    rotuloPontuacaoAuditoriaCampo,
    normalizarAuditoriaCampo,
    calcularStatusEquipamentoAuditoriaCampo,
} from "../../services/auditoriaCampoService";
import {
    respostasAuditoriaCampo,
    tiposAuditoriaCampoDireta,
    categoriasPadronizadasAuditoriaCampo,
    statusAuditoriaCampoDireta,
    grausRiscoAuditoriaCampoDireta,
    descricoesGrauRiscoAuditoriaCampoDireta,
} from "../../constants/sstConstants";
import {
    classNames,
    obterParametroUrl,
    normalizarTextoBusca,
} from "../../utils/sstUtils";
import {
    obterTokenAuditoriaCampoPublicaConfigurado,
    aplicarContatosEmpresaAuditoriaCampoDireta,
    criarFormularioInicialAuditoriaCampoDireta,
    encontrarEmpresaAuditoriaCampoDireta,
    extrairParametrosAuditoriaCampoDireta,
    gerarNumeroAuditoriaCampoDireta,
    listarEmpresasAuditoriaCampoDireta,
    montarLinkAuditoriaCampoDireta,
    montarLinksNotificacaoAuditoriaCampoDireta,
    montarPayloadAuditoriaCampoDireta,
    montarResumoAuditoriaCampoDiretaFinal,
    montarTextoNotificacaoAuditoriaCampoDireta,
    obterContatosEmpresaAuditoriaCampoDireta,
    obterParametrosAuditoriaCampoDiretaUrl,
    uploadFotoAuditoriaCampoDireta,
    validarFormularioAuditoriaCampoDireta,
    formatarTelefoneAuditoriaCampoDireta,
    formatarNumeroAuditoriaCampoDireta,
} from "../../services/auditoriaCampoDiretaService";
import {
    carregarEmpresasAuditoriaPublicaControlada,
    carregarTokenAuditoriaPublicaAtivoPadrao,
    validarAcessoAuditoriaPublicaPadrao,
} from "../../services/auditoriaPublicaTokenService";
import { QRCodeSVG } from "qrcode.react";
import { QrCodeComLogo } from "../qr/QrCodeComLogo";
import {
    AlertTriangle,
    ClipboardCheck,
    Lock,
    Mail,
    MessageCircle,
    QrCode,
    ShieldCheck,
    Upload,
} from "lucide-react";

const OPCAO_EMPRESA_MANUAL_AUDITORIA = "__empresa_nao_cadastrada__";

function formatarWhatsappLinkAuditoriaCampo(valor = "") {
    const apenasDigitos = String(valor || "").replace(/\D/g, "");

    if (!apenasDigitos) return "";

    return apenasDigitos.startsWith("55") ? apenasDigitos : `55${apenasDigitos}`;
}

function obterTextoAuditoriaCampoValido(valor = "") {
    const texto = String(valor || "").trim();
    if (!texto) return "";

    const textoNormalizado = texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();

    if (["nao aplicavel", "nao se aplica", "n/a", "na"].includes(textoNormalizado)) {
        return "";
    }

    return texto;
}

function normalizarBuscaStatusEquipamentoQrCampo(valor = "") {
    return normalizarTextoBusca(valor).replace(/\s+/g, " ").trim();
}

function textoContemValorStatusEquipamentoQrCampo(texto = "", valor = "") {
    const textoNormalizado = normalizarBuscaStatusEquipamentoQrCampo(texto);
    const valorNormalizado = normalizarBuscaStatusEquipamentoQrCampo(valor);

    if (!valorNormalizado) return true;
    if (!textoNormalizado) return false;

    return textoNormalizado === valorNormalizado || textoNormalizado.includes(valorNormalizado) || valorNormalizado.includes(textoNormalizado);
}

function auditoriaConfereStatusEquipamentoQrCampo(auditoria = {}, parametros = {}) {
    const codigo = String(parametros.codigoQrCampo || "").trim();
    const identificacao = String(parametros.identificacao || "").trim();
    const area = String(parametros.area || "").trim();
    const local = String(parametros.local || "").trim();
    const empresa = String(parametros.empresa || "").trim();
    const codigoAuditoria = String(auditoria.codigoQrCampo || auditoria.codigo_qr_campo || auditoria.codigo_qr || auditoria.notificacao?.qrCodeCampo?.codigo || "").trim();

    if (codigo && codigoAuditoria && normalizarBuscaStatusEquipamentoQrCampo(codigoAuditoria) === normalizarBuscaStatusEquipamentoQrCampo(codigo)) {
        return true;
    }

    const maquinaConfere = identificacao
        ? textoContemValorStatusEquipamentoQrCampo(auditoria.maquinaEquipamento || auditoria.maquina_equipamento || "", identificacao)
        : true;
    const areaConfere = area
        ? textoContemValorStatusEquipamentoQrCampo(auditoria.area || "", area)
        : true;
    const localConfere = local
        ? textoContemValorStatusEquipamentoQrCampo(auditoria.local || "", local)
        : true;
    const empresaConfere = empresa
        ? textoContemValorStatusEquipamentoQrCampo(auditoria.empresaResponsavel || auditoria.empresa_responsavel || auditoria.empresaNome || auditoria.empresa_nome || "", empresa)
        : true;

    return maquinaConfere && areaConfere && localConfere && empresaConfere;
}

function escaparFiltroIlikeAuditoriaCampo(valor = "") {
    return String(valor || "").replace(/[\%_]/g, "").trim();
}

function normalizarTokenAuditoriaCampoDireta(valor = "") {
    return String(valor || "").trim();
}

async function carregarTokenAuditoriaCampoPorCodigoQr(codigoQrCampo = "") {
    const codigo = String(codigoQrCampo || "").trim();

    if (!codigo) {
        return { encontrado: false, token: "", erro: "" };
    }

    const { data, error } = await supabase
        .from("auditoria_campo_qrcodes")
        .select("token_publico, ativo")
        .eq("codigo", codigo)
        .neq("ativo", false)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        return { encontrado: false, token: "", erro: error.message || "Não foi possível consultar o QR Code salvo." };
    }

    if (!data) {
        return { encontrado: false, token: "", erro: "QR Code salvo não encontrado no banco." };
    }

    return {
        encontrado: true,
        token: normalizarTokenAuditoriaCampoDireta(data.token_publico),
        erro: "",
    };
}

async function carregarTokenAuditoriaPublicaAtivoDireto() {
    const resultado = await carregarTokenAuditoriaPublicaAtivoPadrao();
    return normalizarTokenAuditoriaCampoDireta(resultado?.tokenPublico);
}

export function NovaAuditoriaCampoDireta({ usuario = null, onAuditoriaSalva, empresasBanco = [] }) {
    const parametros = obterParametrosAuditoriaCampoDiretaUrl();
    const {
        tipoParametro,
        identificacaoParametro,
        areaParametro,
        localParametro,
        empresaParametro,
        subareaParametro,
        tokenParametro,
        codigoQrParametro,
    } = extrairParametrosAuditoriaCampoDireta(parametros);
    const tipoInicial = obterTipoAuditoriaCampoPorParametro(tipoParametro);
    const origem = typeof window !== "undefined" ? window.location.origin : "";
    const linkOrigemQrCampo = typeof window !== "undefined" ? window.location.href : "";
    const codigoQrCampoParametro = String(codigoQrParametro || "").trim();
    const [tokenAuditoriaPublicaSupabase, setTokenAuditoriaPublicaSupabase] = useState("");
    const [tokenAuditoriaQrCampoSalvo, setTokenAuditoriaQrCampoSalvo] = useState("");
    const [tokenAuditoriaPublicaOrigemQrCampo, setTokenAuditoriaPublicaOrigemQrCampo] = useState(false);
    const [tokenAuditoriaPublicaValidado, setTokenAuditoriaPublicaValidado] = useState("");
    const [carregandoTokenAuditoriaPublica, setCarregandoTokenAuditoriaPublica] = useState(false);
    const tokenAuditoriaPublicaConfigurado = tokenAuditoriaPublicaSupabase || obterTokenAuditoriaCampoPublicaConfigurado();
    const tokenAcessoAuditoriaCampo = tokenAuditoriaPublicaValidado || tokenAuditoriaPublicaSupabase || tokenAuditoriaQrCampoSalvo || tokenParametro || tokenAuditoriaPublicaConfigurado;
    const tokenLinkAuditoriaCampo = tokenAuditoriaPublicaSupabase || tokenAuditoriaPublicaValidado || tokenAuditoriaQrCampoSalvo || tokenParametro || tokenAuditoriaPublicaConfigurado;
    const tokenLinkAuditoriaCampoDisponivel = Boolean(tokenLinkAuditoriaCampo);
    const montarLinkAuditoriaCampo = (parametrosExtras = {}) => montarLinkAuditoriaCampoDireta({
        origem,
        token: tokenLinkAuditoriaCampo,
        parametrosExtras,
    });
    const linkGeral = tokenLinkAuditoriaCampoDisponivel ? montarLinkAuditoriaCampo() : "";
    const linkGeralDireto = linkGeral;
    const [empresasPublicasAuditoriaCampo, setEmpresasPublicasAuditoriaCampo] = useState([]);
    const [carregandoEmpresasPublicasAuditoria, setCarregandoEmpresasPublicasAuditoria] = useState(false);
    const [mensagemEmpresasPublicasAuditoria, setMensagemEmpresasPublicasAuditoria] = useState("");
    const [empresaManualHabilitada, setEmpresaManualHabilitada] = useState(() => Boolean(String(empresaParametro || "").trim()));
    const empresasAuditoriaCampo = useMemo(
        () => listarEmpresasAuditoriaCampoDireta([
            ...(Array.isArray(empresasBanco) ? empresasBanco : []),
            ...empresasPublicasAuditoriaCampo,
        ]),
        [empresasBanco, empresasPublicasAuditoriaCampo]
    );


    const tokenAuditoriaPublicaInformado = Boolean(tokenAcessoAuditoriaCampo) || (!usuario && !carregandoTokenAuditoriaPublica);
    const [senhaAcessoAuditoria, setSenhaAcessoAuditoria] = useState("");
    const [acessoAuditoriaValidado, setAcessoAuditoriaValidado] = useState(() => Boolean(usuario));
    const [validandoAcessoAuditoria, setValidandoAcessoAuditoria] = useState(false);
    const [mensagemAcessoAuditoria, setMensagemAcessoAuditoria] = useState("");
    const acessoLiberado = Boolean(usuario) || (tokenAuditoriaPublicaInformado && acessoAuditoriaValidado);
    const mensagemAcesso = "";
    const [salvando, setSalvando] = useState(false);
    const salvandoRef = useRef(false);
    const [mensagem, setMensagem] = useState("");
    const [auditoriaSalva, setAuditoriaSalva] = useState(null);
    const [previewFotos, setPreviewFotos] = useState({ antes: "", depois: "" });
    const [formulario, setFormulario] = useState(() => criarFormularioInicialAuditoriaCampoDireta({
        tipoInicial,
        identificacaoParametro,
        areaParametro,
        subareaParametro,
        localParametro,
        empresaParametro,
    }));
    const [respostasChecklist, setRespostasChecklist] = useState(() => criarRespostasChecklistDinamico(tipoInicial.valor));
    const [historicoStatusEquipamentoQr, setHistoricoStatusEquipamentoQr] = useState([]);
    const [carregandoStatusEquipamentoQr, setCarregandoStatusEquipamentoQr] = useState(false);
    const [mensagemStatusEquipamentoQr, setMensagemStatusEquipamentoQr] = useState("");

    useEffect(() => {
        let ativo = true;

        async function carregarTokenAtivoAuditoriaPublica() {
            setCarregandoTokenAuditoriaPublica(true);

            try {
                let resultadoQrCampo = { encontrado: false, token: "", erro: "" };

                try {
                    resultadoQrCampo = await carregarTokenAuditoriaCampoPorCodigoQr(codigoQrCampoParametro);
                } catch (errorQrCampo) {
                    resultadoQrCampo = {
                        encontrado: false,
                        token: "",
                        erro: errorQrCampo?.message || "Não foi possível consultar o QR Code salvo.",
                    };
                }

                const tokenAtivoSupabase = await carregarTokenAuditoriaPublicaAtivoDireto();

                if (ativo) {
                    setTokenAuditoriaPublicaSupabase(tokenAtivoSupabase);
                    setTokenAuditoriaQrCampoSalvo(resultadoQrCampo.token || "");
                    setTokenAuditoriaPublicaOrigemQrCampo(Boolean(resultadoQrCampo.encontrado));
                }
            } catch (error) {
                console.warn("Não foi possível carregar o token público ativo da auditoria:", error?.message || error);
                if (ativo) {
                    setTokenAuditoriaPublicaSupabase("");
                    setTokenAuditoriaQrCampoSalvo("");
                    setTokenAuditoriaPublicaOrigemQrCampo(false);
                }
            } finally {
                if (ativo) setCarregandoTokenAuditoriaPublica(false);
            }
        }

        carregarTokenAtivoAuditoriaPublica();

        return () => {
            ativo = false;
        };
    }, [codigoQrCampoParametro]);

    useEffect(() => {
        if (usuario) {
            setAcessoAuditoriaValidado(true);
            setMensagemAcessoAuditoria("");
            return;
        }

        setAcessoAuditoriaValidado(false);
        setSenhaAcessoAuditoria("");
        setMensagemAcessoAuditoria("");
        setTokenAuditoriaPublicaValidado("");
    }, [usuario, tokenParametro, codigoQrCampoParametro]);

    const validarSenhaAuditoriaPublica = async (evento) => {
        evento?.preventDefault?.();

        if (!senhaAcessoAuditoria.trim()) {
            setMensagemAcessoAuditoria("Informe a senha de acesso da auditoria.");
            return;
        }

        setValidandoAcessoAuditoria(true);
        setMensagemAcessoAuditoria("");

        try {
            const resultado = await validarAcessoAuditoriaPublicaPadrao({
                senha: senhaAcessoAuditoria.trim(),
                tokens: [
                    tokenAuditoriaPublicaSupabase,
                    tokenAuditoriaPublicaValidado,
                    tokenAuditoriaQrCampoSalvo,
                    tokenParametro,
                    obterTokenAuditoriaCampoPublicaConfigurado(),
                ],
            });

            const autorizado = Boolean(resultado?.autorizado || resultado?.ok === true);

            if (!autorizado) {
                setTokenAuditoriaPublicaValidado("");
                setAcessoAuditoriaValidado(false);
                setMensagemAcessoAuditoria(resultado?.mensagem || "Senha inválida ou token público inativo.");
                return;
            }

            setTokenAuditoriaPublicaValidado(resultado?.tokenValidado || tokenAuditoriaPublicaSupabase || tokenAuditoriaQrCampoSalvo || tokenParametro || "");
            setAcessoAuditoriaValidado(true);
            setMensagemAcessoAuditoria("");
        } catch (error) {
            setTokenAuditoriaPublicaValidado("");
            setAcessoAuditoriaValidado(false);
            setMensagemAcessoAuditoria(error?.message || "Erro ao validar senha da auditoria.");
        } finally {
            setValidandoAcessoAuditoria(false);
        }
    };


    useEffect(() => {
        let ativo = true;

        async function carregarEmpresasPublicasAuditoria() {
            if (usuario) {
                setEmpresasPublicasAuditoriaCampo([]);
                setMensagemEmpresasPublicasAuditoria("");
                return;
            }

            const tokenSeguro = tokenAuditoriaPublicaValidado || tokenAuditoriaQrCampoSalvo || tokenAuditoriaPublicaSupabase || tokenParametro || "";

            if (!acessoAuditoriaValidado || !tokenSeguro || !senhaAcessoAuditoria.trim()) {
                setEmpresasPublicasAuditoriaCampo([]);
                setMensagemEmpresasPublicasAuditoria("");
                return;
            }

            setCarregandoEmpresasPublicasAuditoria(true);
            setMensagemEmpresasPublicasAuditoria("Carregando empresas cadastradas após validação da senha...");

            try {
                const resultado = await carregarEmpresasAuditoriaPublicaControlada({
                    token: tokenSeguro,
                    senha: senhaAcessoAuditoria.trim(),
                });

                if (!ativo) return;

                setEmpresasPublicasAuditoriaCampo(resultado.empresas || []);
                setMensagemEmpresasPublicasAuditoria(resultado.mensagem || "");

                if ((resultado.empresas || []).length > 0) {
                    const empresaAtual = encontrarEmpresaAuditoriaCampoDireta(resultado.empresas, formulario.empresaResponsavel || empresaParametro);

                    if (empresaAtual) {
                        setEmpresaManualHabilitada(false);
                        setFormulario((atual) => aplicarContatosEmpresaAuditoriaCampoDireta(atual, empresaAtual, empresaAtual.nome, { forcar: true }));
                    }
                }
            } catch (error) {
                if (!ativo) return;
                setEmpresasPublicasAuditoriaCampo([]);
                setMensagemEmpresasPublicasAuditoria(error?.message || "Não foi possível carregar empresas cadastradas na auditoria pública.");
            } finally {
                if (ativo) setCarregandoEmpresasPublicasAuditoria(false);
            }
        }

        carregarEmpresasPublicasAuditoria();

        return () => {
            ativo = false;
        };
    }, [
        acessoAuditoriaValidado,
        usuario,
        tokenAuditoriaPublicaValidado,
        tokenAuditoriaQrCampoSalvo,
        tokenAuditoriaPublicaSupabase,
        tokenParametro,
        senhaAcessoAuditoria,
        empresaParametro,
    ]);

    const nomeEmpresaAtualAuditoria = String(formulario.empresaResponsavel || empresaParametro || "").trim();
    const empresaSelecionadaAuditoria = encontrarEmpresaAuditoriaCampoDireta(
        empresasAuditoriaCampo,
        nomeEmpresaAtualAuditoria
    );
    const contatosEmpresaAuditoria = obterContatosEmpresaAuditoriaCampoDireta(empresaSelecionadaAuditoria);

    const tipoAtual = obterTipoAuditoriaCampoDireta(formulario.tipoAuditoria);
    const categoriaAtual = obterCategoriaPadronizadaAuditoriaCampo(formulario.categoriaAuditoria);
    const checklistAtual = useMemo(() => checklistParaTipoAuditoriaCampo(formulario.tipoAuditoria), [formulario.tipoAuditoria]);
    const resultado = useMemo(() => calcularResultadoChecklistDinamico(respostasChecklist), [respostasChecklist]);
    const linkTipoAtual = montarLinkAuditoriaCampo({
        tipo: tipoAtual.parametros[0] || tipoAtual.valor,
    });
    const identificacaoQrEspecifica = obterTextoAuditoriaCampoValido(
        formulario.maquinaEquipamento || identificacaoParametro
    );
    const alvoQrAuditoriaAtual =
        identificacaoQrEspecifica ||
        obterTextoAuditoriaCampoValido(formulario.area || areaParametro) ||
        obterTextoAuditoriaCampoValido(formulario.local || localParametro) ||
        obterTextoAuditoriaCampoValido(formulario.subarea || subareaParametro);
    const linkEspecifico = identificacaoQrEspecifica
        ? montarLinkAuditoriaCampo({
            tipo: tipoAtual.parametros[0] || tipoAtual.valor,
            id: identificacaoQrEspecifica,
            area: formulario.area || areaParametro,
            subarea: formulario.subarea || subareaParametro,
            local: formulario.local || localParametro,
            empresa: formulario.empresaResponsavel || empresaParametro,
            codigo_qr: codigoQrCampoParametro,
        })
        : linkTipoAtual;
    const linkQrAuditoriaAtual = alvoQrAuditoriaAtual ? linkEspecifico : linkGeral;
    const rotuloQrAuditoriaAtual = alvoQrAuditoriaAtual
        ? `QR Code - ${alvoQrAuditoriaAtual}`
        : "QR Code geral";
    const textoNotificacaoResponsavel = useMemo(() => montarTextoNotificacaoAuditoriaCampoDireta({
        formulario,
        tipoAtual,
    }), [formulario, tipoAtual]);

    const parametrosStatusEquipamentoQr = useMemo(() => ({
        codigoQrCampo: codigoQrCampoParametro,
        identificacao: identificacaoParametro || identificacaoQrEspecifica,
        area: areaParametro,
        local: localParametro,
        empresa: empresaParametro,
    }), [codigoQrCampoParametro, identificacaoParametro, identificacaoQrEspecifica, areaParametro, localParametro, empresaParametro]);

    const statusEquipamentoQrCampo = useMemo(
        () => calcularStatusEquipamentoAuditoriaCampo(historicoStatusEquipamentoQr),
        [historicoStatusEquipamentoQr]
    );

    useEffect(() => {
        const carregarStatusEquipamentoQr = async () => {
            const identificacaoConsulta = String(parametrosStatusEquipamentoQr.identificacao || "").trim();
            const areaConsulta = String(parametrosStatusEquipamentoQr.area || "").trim();

            if (!acessoLiberado || (!identificacaoConsulta && !areaConsulta && !parametrosStatusEquipamentoQr.codigoQrCampo)) {
                setHistoricoStatusEquipamentoQr([]);
                setMensagemStatusEquipamentoQr("");
                return;
            }

            setCarregandoStatusEquipamentoQr(true);
            setMensagemStatusEquipamentoQr("");

            try {
                let consulta = supabase
                    .from("auditorias_campo")
                    .select("*")
                    .order("created_at", { ascending: false })
                    .limit(50);

                if (identificacaoConsulta) {
                    consulta = consulta.ilike("maquina_equipamento", `%${escaparFiltroIlikeAuditoriaCampo(identificacaoConsulta)}%`);
                } else if (areaConsulta) {
                    consulta = consulta.ilike("area", `%${escaparFiltroIlikeAuditoriaCampo(areaConsulta)}%`);
                }

                const { data, error } = await consulta;

                if (error) {
                    throw error;
                }

                const historicoNormalizado = (data || [])
                    .map((item) => normalizarAuditoriaCampo(item))
                    .filter((auditoria) => auditoriaConfereStatusEquipamentoQrCampo(auditoria, parametrosStatusEquipamentoQr));

                setHistoricoStatusEquipamentoQr(historicoNormalizado);
                setMensagemStatusEquipamentoQr(historicoNormalizado.length === 0 ? "Nenhuma auditoria anterior vinculada foi encontrada para este QR Code." : "");
            } catch (error) {
                setHistoricoStatusEquipamentoQr([]);
                setMensagemStatusEquipamentoQr("Não foi possível consultar o histórico do equipamento agora. A auditoria pode ser registrada normalmente.");
            } finally {
                setCarregandoStatusEquipamentoQr(false);
            }
        };

        carregarStatusEquipamentoQr();
    }, [acessoLiberado, parametrosStatusEquipamentoQr]);

    const {
        assuntoNotificacaoResponsavel,
        emailResponsavelAuditoria,
        whatsappResponsavelFormatado,
        linkEmailResponsavel,
        linkWhatsappResponsavel,
        emailTstAuditoria,
        whatsappTstFormatado,
        linkEmailTstAuditoria,
        linkWhatsappTstAuditoria,
    } = montarLinksNotificacaoAuditoriaCampoDireta({
        formulario,
        tipoAtual,
        contatosEmpresaAuditoria,
        textoNotificacaoResponsavel,
    });

    const tipoAuditoriaSalva = useMemo(
        () => auditoriaSalva
            ? obterTipoAuditoriaCampoDireta(auditoriaSalva.tipoAuditoria || auditoriaSalva.tipo_auditoria || formulario.tipoAuditoria)
            : tipoAtual,
        [auditoriaSalva, formulario.tipoAuditoria, tipoAtual]
    );
    const resumoAuditoriaSalva = useMemo(
        () => auditoriaSalva
            ? montarResumoAuditoriaCampoDiretaFinal({ auditoria: auditoriaSalva, formulario: {}, tipoAtual: tipoAuditoriaSalva })
            : "",
        [auditoriaSalva, tipoAuditoriaSalva]
    );
    const whatsappResponsavelAuditoriaSalva = auditoriaSalva
        ? formatarWhatsappLinkAuditoriaCampo(auditoriaSalva.whatsappResponsavel || auditoriaSalva.whatsapp_responsavel || auditoriaSalva.notificacao?.whatsappResponsavel || auditoriaSalva.notificacao?.whatsapp_responsavel || "")
        : whatsappResponsavelFormatado;
    const emailResponsavelAuditoriaSalva = auditoriaSalva
        ? String(auditoriaSalva.emailResponsavel || auditoriaSalva.email_responsavel || auditoriaSalva.notificacao?.emailResponsavel || auditoriaSalva.notificacao?.email_responsavel || "").trim()
        : emailResponsavelAuditoria;
    const linkWhatsappAuditoriaSalva = auditoriaSalva && whatsappResponsavelAuditoriaSalva
        ? `https://wa.me/${whatsappResponsavelAuditoriaSalva}?text=${encodeURIComponent(resumoAuditoriaSalva)}`
        : "";
    const linkEmailAuditoriaSalva = auditoriaSalva && emailResponsavelAuditoriaSalva
        ? `mailto:${emailResponsavelAuditoriaSalva}?subject=${encodeURIComponent(`Auditoria de campo - ${formatarNumeroAuditoriaCampoDireta(auditoriaSalva.numeroAuditoria || auditoriaSalva.id || "")}`)}&body=${encodeURIComponent(resumoAuditoriaSalva)}`
        : "";

    const aplicarContatosEmpresaAuditoria = (nomeEmpresa) => {
        const empresa = encontrarEmpresaAuditoriaCampoDireta(empresasAuditoriaCampo, nomeEmpresa);

        setFormulario((atual) => aplicarContatosEmpresaAuditoriaCampoDireta(atual, empresa, nomeEmpresa, { forcar: true }));
    };

    const alterarFormulario = (campo, valor) => {
        const valorTratado = String(campo || "").toLowerCase().includes("whatsapp")
            ? formatarTelefoneAuditoriaCampoDireta(valor)
            : valor;

        setFormulario((atual) => ({ ...atual, [campo]: valorTratado }));
    };

    const alterarEmpresaManualAuditoria = (valor) => {
        setEmpresaManualHabilitada(true);
        setFormulario((atual) => ({
            ...atual,
            empresaResponsavel: valor,
            empresaId: null,
            empresa_id: null,
            responsavelTratativa: atual.responsavelTratativa,
            emailResponsavel: atual.emailResponsavel,
            whatsappResponsavel: atual.whatsappResponsavel,
            nomeTstResponsavel: atual.nomeTstResponsavel,
            emailTstResponsavel: atual.emailTstResponsavel,
            whatsappTstResponsavel: atual.whatsappTstResponsavel,
        }));
    };

    const alterarEmpresaResponsavelAuditoria = (valor) => {
        if (valor === OPCAO_EMPRESA_MANUAL_AUDITORIA) {
            setEmpresaManualHabilitada(true);
            return;
        }

        setEmpresaManualHabilitada(false);
        aplicarContatosEmpresaAuditoria(valor);
    };

    useEffect(() => {
        if (!formulario.empresaResponsavel || !empresaSelecionadaAuditoria) return;
        if (formulario.responsavelTratativa && formulario.emailResponsavel && formulario.whatsappResponsavel && formulario.nomeTstResponsavel && formulario.emailTstResponsavel && formulario.whatsappTstResponsavel) return;

        const timer = window.setTimeout(() => {
            setFormulario((atual) => aplicarContatosEmpresaAuditoriaCampoDireta(
                atual,
                empresaSelecionadaAuditoria,
                formulario.empresaResponsavel,
                { forcar: true }
            ));
        }, 0);

        return () => window.clearTimeout(timer);
    }, [
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

        setFormulario(criarFormularioInicialAuditoriaCampoDireta({
            tipoInicial,
            identificacaoParametro,
            areaParametro,
            subareaParametro,
            localParametro,
            empresaParametro,
        }));
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

    const salvarAuditoriaDireta = async () => {
        if (salvandoRef.current || salvando) {
            setMensagem("A auditoria já está sendo salva. Aguarde a conclusão antes de tentar novamente.");
            return;
        }

        if (auditoriaSalva) {
            setMensagem("Esta auditoria já foi salva. Clique em Nova auditoria para limpar o resultado e iniciar outro registro.");
            return;
        }

        const erroFormulario = validarFormularioAuditoriaCampoDireta(formulario);

        if (erroFormulario) {
            setMensagem(erroFormulario);
            return;
        }

        salvandoRef.current = true;
        setSalvando(true);
        setMensagem("");

        try {
            const tokenAuditoriaCampo = tokenAuditoriaPublicaValidado || tokenAcessoAuditoriaCampo || obterParametroUrl("token") || obterParametroUrl("chave");
            const uploadPublicoAuditoria = Boolean(!usuario && tokenAuditoriaCampo);
            const referenciaUploadFotos = `auditoria-pendente-${Date.now()}`;
            const fotoAntesUrl = await uploadFotoAuditoriaCampoDireta({
                supabaseClient: supabase,
                arquivo: formulario.fotoAntes,
                numeroAuditoria: referenciaUploadFotos,
                tipo: "foto-antes",
                validarArquivoAntesUpload,
                tokenPublico: tokenAuditoriaCampo,
                publico: uploadPublicoAuditoria,
            });
            const fotoDepoisUrl = await uploadFotoAuditoriaCampoDireta({
                supabaseClient: supabase,
                arquivo: formulario.fotoDepois,
                numeroAuditoria: referenciaUploadFotos,
                tipo: "foto-depois",
                validarArquivoAntesUpload,
                tokenPublico: tokenAuditoriaCampo,
                publico: uploadPublicoAuditoria,
            });

            const payload = montarPayloadAuditoriaCampoDireta({
                formulario,
                resultado,
                categoriaAtual,
                tipoAtual,
                tokenParametro: tokenAuditoriaPublicaValidado || tokenAcessoAuditoriaCampo,
                contatosEmpresaAuditoria,
                emailResponsavelAuditoria,
                whatsappResponsavelFormatado,
                emailTstAuditoria,
                whatsappTstFormatado,
                textoNotificacaoResponsavel,
                fotoAntesUrl,
                fotoDepoisUrl,
                codigoQrParametro: codigoQrCampoParametro,
                linkOrigemQrCampo,
            });

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
                const numeroAuditoriaInterna = await gerarNumeroAuditoriaCampoDireta(supabase);
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
            if (previewFotos.antes) URL.revokeObjectURL(previewFotos.antes);
            if (previewFotos.depois) URL.revokeObjectURL(previewFotos.depois);

            setFormulario(criarFormularioInicialAuditoriaCampoDireta({
                tipoInicial,
                identificacaoParametro,
                areaParametro,
                subareaParametro,
                localParametro,
                empresaParametro,
            }));
            setRespostasChecklist(criarRespostasChecklistDinamico(tipoInicial.valor));
            setPreviewFotos({ antes: "", depois: "" });
            setAuditoriaSalva(normalizada);
            setMensagem(`Auditoria ${numeroGerado} salva com sucesso. O formulário foi limpo para evitar registro duplicado.`);
            if (onAuditoriaSalva) onAuditoriaSalva(normalizada);
        } catch (error) {
            setMensagem(error.message || "Erro ao salvar auditoria de campo.");
        } finally {
            salvandoRef.current = false;
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

    if (!usuario && !tokenAuditoriaPublicaInformado && carregandoTokenAuditoriaPublica) {
        return (
            <div className="min-h-screen bg-slate-100 p-4 text-slate-900">
                <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl items-center justify-center">
                    <Card className="w-full">
                        <div className="text-center">
                            <ShieldCheck className="mx-auto h-10 w-10 text-blue-600" />
                            <h1 className="mt-3 text-2xl font-black text-slate-950">Validando QR Code</h1>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                Carregando token público ativo vinculado ao QR Code da auditoria.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    if (!usuario && !tokenAuditoriaPublicaInformado && !carregandoTokenAuditoriaPublica) {
        return (
            <div className="min-h-screen bg-slate-100 p-4 text-slate-900">
                <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl items-center justify-center">
                    <Card className="w-full">
                        <div className="text-center">
                            <ShieldCheck className="mx-auto h-10 w-10 text-red-600" />
                            <h1 className="mt-3 text-2xl font-black text-slate-950">Link inválido</h1>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                Abra o formulário por um link com token público ativo ou por um QR Code salvo com token operacional.
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
                            A consulta pública do QR do funcionário continua liberada sem senha. Esta senha protege somente a abertura da Nova Auditoria de Campo e deve estar cadastrada no Supabase/RPC.
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
                                        <span className="block truncate">{linkQrAuditoriaAtual || (carregandoTokenAuditoriaPublica ? "Carregando token público ativo do Supabase..." : "Token público ativo não encontrado. Verifique Configurações > Auditoria pública e QR Code.")}</span>
                                    </div>
                                    <button type="button" onClick={() => linkQrAuditoriaAtual && copiarTexto(linkQrAuditoriaAtual, alvoQrAuditoriaAtual ? "Link do QR Code específico copiado." : "Link geral copiado.")} disabled={!linkQrAuditoriaAtual} className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                                        <QrCode className="h-4 w-4" />
                                        {alvoQrAuditoriaAtual ? "Copiar link do QR" : "Copiar link geral"}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="mx-auto w-full max-w-[220px] rounded-3xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200 lg:mx-0 lg:justify-self-end">
                            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-2xl bg-slate-50 p-2">
                                {linkQrAuditoriaAtual ? <QrCodeComLogo value={linkQrAuditoriaAtual} size={112} level="H" logoRatio={0.22} /> : <QrCode className="h-12 w-12 text-slate-300" />}
                            </div>
                            <p className="mt-2 truncate text-[11px] font-black uppercase tracking-wide text-slate-950" title={alvoQrAuditoriaAtual || rotuloQrAuditoriaAtual}>
                                {alvoQrAuditoriaAtual || rotuloQrAuditoriaAtual}
                            </p>
                        </div>
                    </div>
                </Card>

                {alvoQrAuditoriaAtual && (
                    <Card className={classNames("overflow-hidden ring-1", statusEquipamentoQrCampo.containerClass)}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className={classNames("mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1", statusEquipamentoQrCampo.statusClass)}>
                                    {statusEquipamentoQrCampo.chave === "critico" ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Status do equipamento pelo QR Code</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <span className={classNames("rounded-full px-3 py-1 text-[11px] font-black uppercase ring-1", statusEquipamentoQrCampo.statusClass)}>
                                            {carregandoStatusEquipamentoQr ? "Consultando histórico..." : statusEquipamentoQrCampo.status}
                                        </span>
                                        {codigoQrCampoParametro && (
                                            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-slate-600 ring-1 ring-slate-200">
                                                QR {codigoQrCampoParametro}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
                                        {carregandoStatusEquipamentoQr ? "Buscando auditorias anteriores vinculadas a este equipamento." : statusEquipamentoQrCampo.orientacao}
                                    </p>
                                    {mensagemStatusEquipamentoQr && (
                                        <p className="mt-1 text-xs font-semibold text-slate-500">{mensagemStatusEquipamentoQr}</p>
                                    )}
                                </div>
                            </div>
                            <div className="grid gap-2 text-center sm:grid-cols-4 lg:min-w-[34rem]">
                                <div className="rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-white/70">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Última</p>
                                    <p className={classNames("mt-1 truncate text-[11px] font-black", statusEquipamentoQrCampo.valueClass)} title={statusEquipamentoQrCampo.ultimaAuditoria}>{statusEquipamentoQrCampo.ultimaAuditoria}</p>
                                </div>
                                <div className="rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-white/70">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Pendências</p>
                                    <p className={classNames("mt-1 text-[11px] font-black", statusEquipamentoQrCampo.valueClass)}>{statusEquipamentoQrCampo.pendenciasAbertas} aberta(s)</p>
                                </div>
                                <div className="rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-white/70">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Maior risco</p>
                                    <p className={classNames("mt-1 text-[11px] font-black", statusEquipamentoQrCampo.valueClass)}>{statusEquipamentoQrCampo.maiorRisco}</p>
                                </div>
                                <div className="rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-white/70">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Auditorias</p>
                                    <p className={classNames("mt-1 text-[11px] font-black", statusEquipamentoQrCampo.valueClass)}>{statusEquipamentoQrCampo.totalAuditorias || 0}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

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
                                        value={empresaSelecionadaAuditoria ? (empresaSelecionadaAuditoria.id || empresaSelecionadaAuditoria.nome) : empresaManualHabilitada ? OPCAO_EMPRESA_MANUAL_AUDITORIA : ""}
                                        onChange={(e) => alterarEmpresaResponsavelAuditoria(e.target.value)}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-300"
                                    >
                                        <option value="">Selecione uma empresa cadastrada</option>
                                        {empresasAuditoriaCampo.map((empresa) => (
                                            <option key={empresa.id || empresa.nome} value={empresa.id || empresa.nome}>{empresa.nome}</option>
                                        ))}
                                        <option value={OPCAO_EMPRESA_MANUAL_AUDITORIA}>Empresa não cadastrada / informar manualmente</option>
                                    </select>
                                    {empresaManualHabilitada && (
                                        <input
                                            value={formulario.empresaResponsavel || ""}
                                            onChange={(e) => alterarEmpresaManualAuditoria(e.target.value)}
                                            list="empresas-auditoria-campo"
                                            placeholder="Digite o nome completo da empresa"
                                            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                        />
                                    )}
                                    <datalist id="empresas-auditoria-campo">
                                        {empresasAuditoriaCampo.map((empresa) => (
                                            <option key={empresa.id || empresa.nome} value={empresa.nome} />
                                        ))}
                                    </datalist>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        Selecione uma empresa cadastrada para evitar duplicidade nos relatórios. Use digitação manual somente como exceção.
                                    </p>
                                    {empresaSelecionadaAuditoria && (
                                        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                                            <span>
                                                Empresa vinculada: {empresaSelecionadaAuditoria.nome}. {contatosEmpresaAuditoria.responsavel || contatosEmpresaAuditoria.email || contatosEmpresaAuditoria.whatsapp || contatosEmpresaAuditoria.tstResponsavel ? "Contatos encontrados no cadastro." : "Cadastro sem contatos preenchidos."}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setFormulario((atual) => aplicarContatosEmpresaAuditoriaCampoDireta(atual, empresaSelecionadaAuditoria, empresaSelecionadaAuditoria.nome, { forcar: true }))}
                                                className="rounded-full bg-white px-3 py-1 font-black text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                                            >
                                                Preencher contatos
                                            </button>
                                        </div>
                                    )}
                                    {!usuario && acessoAuditoriaValidado && (
                                        <p className={classNames("mt-1 rounded-2xl px-3 py-2 text-[11px] font-semibold ring-1", mensagemEmpresasPublicasAuditoria && empresasAuditoriaCampo.length === 0 ? "bg-orange-50 text-orange-700 ring-orange-100" : "bg-blue-50 text-blue-700 ring-blue-100")}>
                                            {carregandoEmpresasPublicasAuditoria
                                                ? "Carregando empresas cadastradas após validação da senha..."
                                                : mensagemEmpresasPublicasAuditoria || "Empresas cadastradas disponíveis após validação da senha pública."}
                                        </p>
                                    )}
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
                            <div className="mb-4 rounded-3xl bg-blue-50 p-4 ring-1 ring-blue-100">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <p className="text-sm font-black text-blue-950">Empresa para preenchimento automático</p>
                                        <p className="mt-1 text-xs leading-relaxed text-blue-700">
                                            Selecione a empresa cadastrada para preencher responsável, e-mail, WhatsApp e TST. Use digitação manual somente quando a empresa não estiver cadastrada.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!empresaSelecionadaAuditoria}
                                        onClick={() => setFormulario((atual) => aplicarContatosEmpresaAuditoriaCampoDireta(atual, empresaSelecionadaAuditoria, empresaSelecionadaAuditoria?.nome || formulario.empresaResponsavel, { forcar: true }))}
                                        className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:ring-slate-200"
                                    >
                                        Preencher contatos da empresa
                                    </button>
                                </div>

                                <select
                                    value={empresaSelecionadaAuditoria ? (empresaSelecionadaAuditoria.id || empresaSelecionadaAuditoria.nome) : empresaManualHabilitada ? OPCAO_EMPRESA_MANUAL_AUDITORIA : ""}
                                    onChange={(e) => alterarEmpresaResponsavelAuditoria(e.target.value)}
                                    className="mt-3 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200"
                                >
                                    <option value="">Selecione uma empresa cadastrada</option>
                                    {empresasAuditoriaCampo.map((empresa) => (
                                        <option key={empresa.id || empresa.nome} value={empresa.id || empresa.nome}>{empresa.nome}</option>
                                    ))}
                                    <option value={OPCAO_EMPRESA_MANUAL_AUDITORIA}>Empresa não cadastrada / informar manualmente</option>
                                </select>

                                {empresaManualHabilitada && (
                                    <input
                                        value={formulario.empresaResponsavel || ""}
                                        onChange={(e) => alterarEmpresaManualAuditoria(e.target.value)}
                                        list="empresas-auditoria-campo"
                                        placeholder="Digite o nome completo da empresa"
                                        className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                )}

                                {empresaSelecionadaAuditoria ? (
                                    <p className="mt-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                                        Empresa vinculada: {empresaSelecionadaAuditoria.nome}. {contatosEmpresaAuditoria.responsavel || contatosEmpresaAuditoria.email || contatosEmpresaAuditoria.whatsapp || contatosEmpresaAuditoria.tstResponsavel ? "Contatos encontrados no cadastro." : "Cadastro sem contatos preenchidos."}
                                    </p>
                                ) : (
                                    <p className="mt-2 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                                        Nenhuma empresa cadastrada selecionada. Os campos abaixo permanecerão manuais até selecionar uma empresa.
                                    </p>
                                )}
                            </div>
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
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Auditoria salva</p>
                                    <h2 className="mt-1 text-xl font-black text-emerald-950">{formatarNumeroAuditoriaCampoDireta(auditoriaSalva.numeroAuditoria || auditoriaSalva.id)}</h2>
                                    <p className="mt-1 text-sm text-emerald-700">Resumo técnico pronto para encaminhar ao encarregado e acompanhar a tratativa.</p>
                                </div>
                                <button type="button" onClick={limparFormularioAuditoriaCampo} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700">Nova auditoria</button>
                            </div>

                            {resumoAuditoriaSalva && (
                                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-3xl bg-white p-4 text-xs leading-relaxed text-slate-700 ring-1 ring-emerald-100">
                                    {resumoAuditoriaSalva}
                                </pre>
                            )}

                            <div className="grid gap-2 md:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={() => copiarTexto(resumoAuditoriaSalva, "Resumo da auditoria copiado.")}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50"
                                >
                                    <ClipboardCheck className="h-4 w-4" />
                                    Copiar resumo
                                </button>
                                {linkWhatsappAuditoriaSalva ? (
                                    <a href={linkWhatsappAuditoriaSalva} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50">
                                        <MessageCircle className="h-4 w-4" />
                                        Enviar WhatsApp
                                    </a>
                                ) : (
                                    <button type="button" disabled className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-400 ring-1 ring-slate-200">
                                        <MessageCircle className="h-4 w-4" />
                                        WhatsApp indisponível
                                    </button>
                                )}
                                {linkEmailAuditoriaSalva ? (
                                    <a href={linkEmailAuditoriaSalva} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50">
                                        <Mail className="h-4 w-4" />
                                        Enviar e-mail
                                    </a>
                                ) : (
                                    <button type="button" disabled className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-400 ring-1 ring-slate-200">
                                        <Mail className="h-4 w-4" />
                                        E-mail indisponível
                                    </button>
                                )}
                            </div>
                        </div>
                    </Card>
                )}

                <div className="flex flex-col gap-3 rounded-3xl bg-white/95 p-3 shadow-xl ring-1 ring-slate-200 backdrop-blur md:sticky md:bottom-4 md:z-10 md:flex-row">
                    <button type="button" onClick={salvarAuditoriaDireta} disabled={salvando || Boolean(auditoriaSalva)} className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                        {salvando ? "Salvando auditoria..." : auditoriaSalva ? "Auditoria já salva — clique em Nova auditoria" : "+ Salvar nova auditoria de campo"}
                    </button>
                    <button type="button" onClick={limparFormularioAuditoriaCampo} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 md:w-auto">
                        Nova auditoria / limpar formulário
                    </button>
                </div>
            </div>
        </div>
    );
}


