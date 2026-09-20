import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function texto(valor: unknown) {
  return String(valor ?? "").trim();
}

function limparNomeArquivo(nome: string) {
  return texto(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140) || "foto-auditoria.jpg";
}

function bytesFromBase64(base64: string) {
  const limpo = texto(base64).includes(",") ? texto(base64).split(",").pop() || "" : texto(base64);
  const binario = atob(limpo);
  const bytes = new Uint8Array(binario.length);

  for (let index = 0; index < binario.length; index += 1) {
    bytes[index] = binario.charCodeAt(index);
  }

  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, erro: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, erro: "Secrets do Supabase não configuradas na Edge Function." }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const tokenAuditoria = texto(body.tokenAuditoria || body.token_auditoria || body.token || "TOKEN-AUDITORIA-CAMPO-2026");
    const senha = texto(body.senha || body.senhaAuditoria || body.senha_auditoria);
    const tokenQr = texto(body.tokenQr || body.token_qr || body?.auditoria?.token_qr);
    const auditoria =
      body.auditoria && typeof body.auditoria === "object" && !Array.isArray(body.auditoria)
        ? body.auditoria
        : {};
    const desvio =
      body.desvio && typeof body.desvio === "object" && !Array.isArray(body.desvio)
        ? body.desvio
        : null;
    const fotos =
      body.fotos && typeof body.fotos === "object" && !Array.isArray(body.fotos)
        ? body.fotos
        : {};

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    if (!tokenQr) {
      return jsonResponse({ ok: false, erro: "Token QR do colaborador não informado." }, 400);
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from("auditoria_tokens_publicos")
      .select("id, empresa_id, token, senha_acesso, requer_senha, ativo, data_expiracao")
      .eq("token", tokenAuditoria)
      .eq("ativo", true)
      .maybeSingle();

    if (tokenError) {
      return jsonResponse({ ok: false, erro: tokenError.message }, 500);
    }

    if (!tokenData) {
      return jsonResponse({ ok: false, erro: "Token público da auditoria inválido ou inativo." }, 401);
    }

    if (tokenData.data_expiracao) {
      const hoje = new Date();
      const expiracao = new Date(`${tokenData.data_expiracao}T23:59:59`);
      if (expiracao < hoje) {
        return jsonResponse({ ok: false, erro: "Token público da auditoria expirado." }, 401);
      }
    }

    if ((tokenData.requer_senha ?? true) && texto(tokenData.senha_acesso) !== senha) {
      return jsonResponse({ ok: false, erro: "Senha inválida para salvar a auditoria." }, 401);
    }

    if (!tokenData.empresa_id) {
      return jsonResponse({ ok: false, erro: "Token público da auditoria sem empresa vinculada." }, 403);
    }

    const { data: empresaToken, error: empresaTokenError } = await supabase
      .from("empresas")
      .select("id, tenant_id")
      .eq("id", tokenData.empresa_id)
      .maybeSingle();

    if (empresaTokenError) {
      return jsonResponse({ ok: false, erro: empresaTokenError.message }, 500);
    }

    if (!empresaToken?.tenant_id) {
      return jsonResponse({ ok: false, erro: "Token público da auditoria sem tenant válido." }, 403);
    }

    const { data: colaborador, error: colaboradorError } = await supabase
      .from("colaboradores")
      .select("*")
      .eq("token_qr", tokenQr)
      .maybeSingle();

    if (colaboradorError) {
      return jsonResponse({ ok: false, erro: colaboradorError.message }, 500);
    }

    if (!colaborador) {
      return jsonResponse({ ok: false, erro: "Colaborador não encontrado para o token QR informado." }, 404);
    }

    if (!colaborador.empresa_id) {
      return jsonResponse({ ok: false, erro: "Colaborador sem empresa válida para registrar a auditoria." }, 403);
    }

    const { data: empresaColaborador, error: empresaColaboradorError } = await supabase
      .from("empresas")
      .select("id, nome, tenant_id")
      .eq("id", colaborador.empresa_id)
      .maybeSingle();

    if (empresaColaboradorError) {
      return jsonResponse({ ok: false, erro: empresaColaboradorError.message }, 500);
    }

    if (!empresaColaborador?.tenant_id) {
      return jsonResponse({ ok: false, erro: "Empresa do colaborador sem tenant válido." }, 403);
    }

    if (empresaToken.tenant_id !== empresaColaborador.tenant_id) {
      return jsonResponse({
        ok: false,
        erro: "O colaborador informado não pertence ao ambiente autorizado por este token de auditoria.",
      }, 403);
    }

    const notificacaoEntrada =
      auditoria.notificacao &&
        typeof auditoria.notificacao === "object" &&
        !Array.isArray(auditoria.notificacao)
        ? auditoria.notificacao
        : {};

    function limparTituloNotificacao(valor: unknown) {
      return texto(valor)
        .replace(/\bAUD-\d{4}-\d+\b/gi, "")
        .replace(/^[\s\-–—:|.]+/, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    function limparMensagemNotificacao(valor: unknown) {
      return texto(valor)
        .replace(/^\s*Auditoria\s+AUD-\d{4}-\d+\s*[.:\-–—]*\s*/i, "")
        .replace(/\bAUD-\d{4}-\d+\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .replace(/\s([.,;:!?])/g, "$1")
        .trim();
    }

    const notificacaoBase = {
      titulo: limparTituloNotificacao(notificacaoEntrada.titulo),
      mensagem: limparMensagemNotificacao(notificacaoEntrada.mensagem),
      complementos: Array.isArray(notificacaoEntrada.complementos)
        ? notificacaoEntrada.complementos
          .map((item: unknown) => texto(item))
          .filter(Boolean)
          .slice(0, 50)
        : [],
      observacao: texto(notificacaoEntrada.observacao),
      auditor:
        texto(notificacaoEntrada.auditor) ||
        texto(auditoria.auditor_nome) ||
        "Auditor via QR Code",
    };

    const respostasCanonicas = new Map([
      ["conforme", { texto: "Conforme", pontos: 10, regra_pontuacao: "10 pontos" }],
      ["observacao_leve", { texto: "Observação leve", pontos: 8, regra_pontuacao: "8 pontos" }],
      ["nao_conforme", { texto: "Não conforme", pontos: 5, regra_pontuacao: "5 pontos" }],
      ["desvio_grave", { texto: "Desvio grave", pontos: 0, regra_pontuacao: "0 ponto + ação imediata" }],
      ["nao_aplicavel", { texto: "Não aplicável", pontos: 0, regra_pontuacao: "Ignora o cálculo" }],
    ]);

    const categoriasCanonicas = [
      { chave: "epi", texto: "EPI" },
      { chave: "frente_trabalho", texto: "Frente de trabalho" },
      { chave: "comportamento_seguro", texto: "Comportamento seguro" },
    ];

    const statusDesvioPermitidos = new Set(["Aberto", "Em tratativa", "Corrigido", "Cancelado"]);
    const gravidadesPermitidas = new Set(["Leve", "Moderada", "Grave", "Crítica"]);

    const checklistEntrada =
      Array.isArray(auditoria.checklist)
        ? auditoria.checklist
        : [];

    if (checklistEntrada.length !== categoriasCanonicas.length) {
      return jsonResponse({
        ok: false,
        erro: "Checklist da auditoria incompleto ou inválido.",
      }, 400);
    }

    const checklistPorCategoria = new Map();

    for (const item of checklistEntrada) {
      const chaveCategoria = texto(item?.chave_categoria);
      const chaveResposta = texto(item?.chave_resposta);
      const categoriaValida = categoriasCanonicas.find(
        (categoria) => categoria.chave === chaveCategoria,
      );
      const respostaValida = respostasCanonicas.get(chaveResposta);

      if (!categoriaValida || !respostaValida) {
        return jsonResponse({
          ok: false,
          erro: "Checklist contém categoria ou resposta inválida.",
        }, 400);
      }

      if (checklistPorCategoria.has(chaveCategoria)) {
        return jsonResponse({
          ok: false,
          erro: "Checklist contém categoria duplicada.",
        }, 400);
      }

      checklistPorCategoria.set(chaveCategoria, {
        chave_resposta: chaveResposta,
      });
    }

    if (checklistPorCategoria.size !== categoriasCanonicas.length) {
      return jsonResponse({
        ok: false,
        erro: "Checklist não contém todas as categorias obrigatórias.",
      }, 400);
    }

    const checklistSeguro = categoriasCanonicas.map((categoria) => {
      const entrada = checklistPorCategoria.get(categoria.chave);
      const resposta = respostasCanonicas.get(entrada?.chave_resposta);

      return {
        categoria: categoria.texto,
        chave_categoria: categoria.chave,
        resposta: resposta?.texto || "",
        chave_resposta: entrada?.chave_resposta || "",
        pontos: Number(resposta?.pontos || 0),
        regra_pontuacao: resposta?.regra_pontuacao || "",
      };
    });

    const aplicaveis = checklistSeguro.filter(
      (item) => item.chave_resposta !== "nao_aplicavel",
    );

    const basePontuacao = Math.max(1, aplicaveis.length * 10);
    const pontosCalculados = aplicaveis.reduce(
      (total, item) => total + Number(item.pontos || 0),
      0,
    );
    const percentualCalculado = Math.max(
      0,
      Math.min(
        100,
        Math.round((pontosCalculados / basePontuacao) * 100),
      ),
    );

    const temDesvioGrave = checklistSeguro.some(
      (item) => item.chave_resposta === "desvio_grave",
    );

    let classificacaoCalculada = "Crítico";

    if (temDesvioGrave) classificacaoCalculada = "Ação imediata";
    else if (percentualCalculado >= 90) classificacaoCalculada = "Excelente";
    else if (percentualCalculado >= 75) classificacaoCalculada = "Conforme com observações";
    else if (percentualCalculado >= 50) classificacaoCalculada = "Atenção";

    const precisaDesvio = checklistSeguro.some(
      (item) =>
        ["desvio_grave", "nao_conforme", "observacao_leve"].includes(
          item.chave_resposta,
        ),
    );

    const desvioEfetivo = precisaDesvio ? desvio : null;

    if (precisaDesvio && !desvioEfetivo) {
      return jsonResponse({
        ok: false,
        erro: "O checklist exige o registro de um desvio.",
      }, 400);
    }

    const descricaoDesvio =
      desvioEfetivo ? texto(desvioEfetivo.descricao) : "";

    if (precisaDesvio && !descricaoDesvio) {
      return jsonResponse({
        ok: false,
        erro: "Informe a descrição do desvio.",
      }, 400);
    }

    const categoriaDesvio =
      precisaDesvio
        ? temDesvioGrave
          ? "Desvio grave"
          : "Pendência de auditoria"
        : "";

    const statusDesvioEntrada =
      desvioEfetivo ? texto(desvioEfetivo.status) : "";

    const statusDesvio =
      precisaDesvio && statusDesvioPermitidos.has(statusDesvioEntrada)
        ? statusDesvioEntrada
        : precisaDesvio
          ? "Aberto"
          : "Sem desvio";

    const gravidadeEntrada =
      desvioEfetivo ? texto(desvioEfetivo.gravidade) : "";

    const gravidadeDesvio =
      temDesvioGrave
        ? "Crítica"
        : gravidadesPermitidas.has(gravidadeEntrada)
          ? gravidadeEntrada
          : "Leve";

    const auditoriaId = crypto.randomUUID();
    const auditoriaPayload = {
      id: auditoriaId,
      colaborador_id: colaborador.id,
      empresa_id: colaborador.empresa_id,
      token_qr: tokenQr,
      colaborador_nome: colaborador.nome || "",
      empresa_nome: empresaColaborador.nome || colaborador.empresa_nome || colaborador.empresa || "",
      funcao: colaborador.funcao || "",
      tipo_auditoria: "Colaborador",
      titulo: `Auditoria de campo - ${texto(colaborador.nome) || "Colaborador"}`,
      status_documental: texto(auditoria.status_documental) || null,
      observacao: texto(auditoria.observacao),
      boas_praticas: texto(auditoria.boas_praticas),
      checklist: checklistSeguro,
      pontuacao: percentualCalculado,
      classificacao: classificacaoCalculada,
      tem_desvio_grave: temDesvioGrave,
      categoria_desvio_principal: categoriaDesvio,
      total_desvios: precisaDesvio ? 1 : 0,
      status_desvio: statusDesvio,
      auditor_nome: notificacaoBase.auditor,
      origem: "QR Code do colaborador",
      created_at: new Date().toISOString(),
    };

    const { data: auditoriaCriada, error: auditoriaError } = await supabase
      .from("auditorias_campo")
      .insert(auditoriaPayload)
      .select("*")
      .single();

    if (auditoriaError) {
      return jsonResponse({ ok: false, erro: auditoriaError.message }, 500);
    }

    const arquivosCriados: string[] = [];

    async function compensarAuditoria() {
      const errosCompensacao: string[] = [];

      if (arquivosCriados.length > 0) {
        const { error: storageCleanupError } = await supabase.storage
          .from("auditorias-campo")
          .remove([...arquivosCriados]);

        if (storageCleanupError) {
          errosCompensacao.push(`storage: ${storageCleanupError.message}`);
        }
      }

      const { error: auditoriaCleanupError } = await supabase
        .from("auditorias_campo")
        .delete()
        .eq("id", auditoriaId);

      if (auditoriaCleanupError) {
        errosCompensacao.push(`auditoria: ${auditoriaCleanupError.message}`);
      }

      if (errosCompensacao.length > 0) {
        console.error("Falha parcial na compensação da auditoria QR.", {
          auditoriaId,
          arquivosCriados: [...arquivosCriados],
          erros: errosCompensacao,
        });
      }

      return errosCompensacao;
    }

    const numeroAuditoriaOficial = texto(auditoriaCriada?.numero_auditoria);

    if (!numeroAuditoriaOficial) {
      await compensarAuditoria();

      return jsonResponse({
        ok: false,
        erro: "O banco não retornou o número oficial da auditoria.",
      }, 500);
    }

    const tituloBaseNotificacao =
      notificacaoBase.titulo ||
      `Auditoria de campo - ${texto(colaborador.nome) || "Colaborador"}`;

    const mensagemBaseNotificacao =
      notificacaoBase.mensagem ||
      `Foi registrada uma auditoria de campo para ${texto(colaborador.nome) || "colaborador"}, ` +
        `da empresa ${texto(empresaColaborador.nome) || "empresa não informada"}. ` +
        `Resultado: ${classificacaoCalculada} (${percentualCalculado}%).`;

    const tituloNotificacaoFinal =
      `${numeroAuditoriaOficial} - ${tituloBaseNotificacao}`;

    const mensagemNotificacaoFinal =
      `Auditoria ${numeroAuditoriaOficial}. ${mensagemBaseNotificacao}`.trim();

    const linhasPreview = [
      `Assunto: ${tituloNotificacaoFinal}`,
      "",
      mensagemNotificacaoFinal,
    ];

    if (notificacaoBase.complementos.length > 0) {
      linhasPreview.push("", "Complementos:");

      notificacaoBase.complementos.forEach((item: string, index: number) => {
        linhasPreview.push(`${index + 1}. ${item}`);
      });
    }

    const notificacaoFinal = {
      titulo: tituloNotificacaoFinal,
      mensagem: mensagemNotificacaoFinal,
      numero_auditoria: numeroAuditoriaOficial,
      complementos: notificacaoBase.complementos,
      observacao: notificacaoBase.observacao,
      preview: linhasPreview.join("\n").trim(),
      auditor: notificacaoBase.auditor,
    };

    const { data: auditoriaAtualizada, error: notificacaoError } = await supabase
      .from("auditorias_campo")
      .update({ notificacao: notificacaoFinal })
      .eq("id", auditoriaId)
      .select("*")
      .single();

    if (notificacaoError || !auditoriaAtualizada) {
      await compensarAuditoria();

      return jsonResponse({
        ok: false,
        erro:
          notificacaoError?.message ||
          "Não foi possível consolidar a notificação com o número oficial.",
      }, 500);
    }

    const auditoriaFinal = auditoriaAtualizada;

    async function uploadFoto(foto: any, tipo: "antes" | "depois") {
      if (!foto?.base64) return "";

      const nomeArquivo = `${tipo}-${Date.now()}-${limparNomeArquivo(foto.nome || "foto-auditoria.jpg")}`;
      const caminho = `auditorias-publicas/qr-colaborador/${auditoriaId}/${nomeArquivo}`;
      const bytes = bytesFromBase64(foto.base64);

      const { error } = await supabase.storage
        .from("auditorias-campo")
        .upload(caminho, bytes, {
          contentType: texto(foto.tipo) || "image/jpeg",
          upsert: true,
        });

      if (error) throw error;

      arquivosCriados.push(caminho);

      return caminho;
    }

    let desvioCriado = null;

    if (desvioEfetivo) {
      let fotoAntesUrl = "";
      let fotoDepoisUrl = "";

      try {
        fotoAntesUrl = await uploadFoto(fotos.antes, "antes");
        fotoDepoisUrl = await uploadFoto(fotos.depois, "depois");
      } catch (error) {
        await compensarAuditoria();

        return jsonResponse({ ok: false, erro: `Erro ao enviar foto da auditoria: ${error?.message || String(error)}` }, 500);
      }

      const prazoDesvio = texto(desvioEfetivo.prazo);

      const desvioPayload = {
        id: crypto.randomUUID(),
        auditoria_id: auditoriaId,
        colaborador_id: colaborador.id,
        empresa_id: auditoriaPayload.empresa_id,
        categoria: categoriaDesvio,
        descricao: descricaoDesvio,
        gravidade: gravidadeDesvio,
        acao_imediata: texto(desvioEfetivo.acao_imediata),
        responsavel: texto(desvioEfetivo.responsavel),
        prazo: /^\d{4}-\d{2}-\d{2}$/.test(prazoDesvio) ? prazoDesvio : null,
        status: statusDesvio,
        observacao: texto(desvioEfetivo.observacao),
        observacao_aberto: texto(desvioEfetivo.observacao_aberto),
        observacao_tratativa: texto(desvioEfetivo.observacao_tratativa),
        observacao_corrigido: texto(desvioEfetivo.observacao_corrigido),
        notificacao: notificacaoFinal,
        foto_antes_url: fotoAntesUrl,
        foto_depois_url: fotoDepoisUrl,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("auditoria_campo_desvios")
        .insert(desvioPayload)
        .select("*")
        .single();

      if (error) {
        await compensarAuditoria();

        return jsonResponse({ ok: false, erro: error.message }, 500);
      }

      desvioCriado = data;
    }

    return jsonResponse({
      ok: true,
      mensagem: "Auditoria registrada com sucesso.",
      auditoria: auditoriaFinal,
      desvio: desvioCriado,
    });
  } catch (error) {
    return jsonResponse({ ok: false, erro: error?.message || String(error) }, 500);
  }
});
