// supabase/functions/rapid-api/index.ts
// Função usada pelo App para envio automático de alertas SST por Gmail.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VARIAVEIS_MODELO_EMAIL = new Set([
  "saudacao",
  "tst_responsavel",
  "empresa_nome",
  "total_vencidos",
  "total_a_vencer",
  "quantidade_itens",
  "resumo",
  "itens",
  "sistema_nome",
  "url_sistema",
  "data_envio",
]);

function textoSeguro(valor: unknown, limite = 1000) {
  if (
    typeof valor !== "string" &&
    typeof valor !== "number"
  ) {
    return "";
  }

  return String(valor)
    .replace(/\0/g, "")
    .trim()
    .slice(0, limite);
}

function textoCabecalho(valor: unknown, limite = 220) {
  return textoSeguro(valor, limite)
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function obterObjetoSeguro(valor: unknown): Record<string, unknown> {
  if (
    !valor ||
    typeof valor !== "object" ||
    Array.isArray(valor)
  ) {
    return {};
  }

  return valor as Record<string, unknown>;
}

function normalizarDias(valor: unknown) {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? Math.trunc(numero)
    : 0;
}

function obterVariaveisDesconhecidas(conteudo: string) {
  const desconhecidas = new Set<string>();
  const expressao = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

  for (const correspondencia of conteudo.matchAll(expressao)) {
    const chave = String(correspondencia[1] || "")
      .trim()
      .toLowerCase();

    if (
      chave &&
      !VARIAVEIS_MODELO_EMAIL.has(chave)
    ) {
      desconhecidas.add(chave);
    }
  }

  return [...desconhecidas];
}

function validarVariaveisModelo(
  conteudo: string,
  campo: string,
) {
  const desconhecidas =
    obterVariaveisDesconhecidas(conteudo);

  if (desconhecidas.length > 0) {
    throw new Error(
      `O campo ${campo} contém variáveis não permitidas: ${desconhecidas
        .map((item) => `{{${item}}}`)
        .join(", ")}.`,
    );
  }
}

function substituirVariaveisModelo(
  conteudo: string,
  valores: Record<string, string>,
) {
  return conteudo.replace(
    /\{\{\s*([a-z0-9_]+)\s*\}\}/gi,
    (trechoCompleto, chaveOriginal) => {
      const chave = String(chaveOriginal || "")
        .trim()
        .toLowerCase();

      return Object.prototype.hasOwnProperty.call(
        valores,
        chave,
      )
        ? valores[chave]
        : trechoCompleto;
    },
  );
}

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function montarHtmlEmail(texto: string) {
  return escaparHtml(texto)
    .replace(/\n/g, "<br>")
    .replace(
      /VENCIDO HÁ/g,
      "<strong style='color:#b91c1c'>VENCIDO HÁ</strong>",
    )
    .replace(
      /A VENCER EM/g,
      "<strong style='color:#c2410c'>A VENCER EM</strong>",
    );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const dadosRecebidos =
      obterObjetoSeguro(await req.json());

    const para =
      dadosRecebidos.para;

    const assunto =
      dadosRecebidos.assunto;

    const empresa =
      dadosRecebidos.empresa;

    const tstResponsavel =
      dadosRecebidos.tstResponsavel;

    const itens =
      dadosRecebidos.itens;

    const modelo =
      dadosRecebidos.modelo;

    const tipoModelo =
      dadosRecebidos.tipoModelo;

    const sistema =
      dadosRecebidos.sistema;

    const urlSistema =
      dadosRecebidos.urlSistema;

    const destinatario =
      textoSeguro(para, 1000)
        .split(/[;,]/)
        .map((email) => email.trim())
        .filter(Boolean)
        .join(",");

    if (!destinatario) {
      throw new Error(
        "E-mail do destinatário/TST não informado.",
      );
    }

    if (
      !Array.isArray(itens) ||
      itens.length === 0
    ) {
      throw new Error(
        "Nenhum documento/treinamento foi informado para o alerta.",
      );
    }

    const gmailUser =
      Deno.env.get("GMAIL_USER");

    const gmailAppPassword =
      Deno.env.get("GMAIL_APP_PASSWORD");

    if (
      !gmailUser ||
      !gmailAppPassword
    ) {
      throw new Error(
        "Credenciais GMAIL_USER e GMAIL_APP_PASSWORD não configuradas no Supabase.",
      );
    }

    const transporter =
      nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });

    const itensNormalizados =
      itens.map((item) => {
        const registro =
          obterObjetoSeguro(item);

        return {
          colaborador:
            textoSeguro(registro.colaborador, 300) ||
            "-",

          codigo:
            textoSeguro(registro.codigo, 100) ||
            "-",

          funcao:
            textoSeguro(registro.funcao, 300) ||
            "-",

          situacaoObra:
            textoSeguro(registro.situacaoObra, 300) ||
            "-",

          treinamento:
            textoSeguro(registro.treinamento, 500) ||
            "-",

          realizacao:
            textoSeguro(registro.realizacao, 100) ||
            "Não informada",

          vencimento:
            textoSeguro(registro.vencimento, 100) ||
            "Não informada",

          dias:
            normalizarDias(registro.dias),

          arquivo:
            textoSeguro(registro.arquivo, 500) ||
            "Não informado",
        };
      });

    const totalVencidos =
      itensNormalizados.filter(
        (item) => item.dias < 0,
      ).length;

    const totalAVencer =
      itensNormalizados.filter(
        (item) => item.dias >= 0,
      ).length;

    const linhas =
      itensNormalizados
        .map((item, index) => {
          const situacao =
            item.dias < 0
              ? `VENCIDO HÁ ${Math.abs(item.dias)} DIA(S)`
              : `A VENCER EM ${item.dias} DIA(S)`;

          return [
            `${index + 1}. COLABORADOR: ${item.colaborador}`,
            `Código: ${item.codigo}`,
            `Função: ${item.funcao}`,
            `Situação na obra: ${item.situacaoObra}`,
            `Documento/Treinamento: ${item.treinamento}`,
            `Data de elaboração/realização: ${item.realizacao}`,
            `Data de vencimento: ${item.vencimento}`,
            `Status: ${situacao}`,
            `Arquivo: ${item.arquivo}`,
          ].join("\n");
        })
        .join("\n\n");

    const empresaTratada =
      textoSeguro(empresa, 300) ||
      "Empresa não informada";

    const tstResponsavelTratado =
      textoSeguro(tstResponsavel, 300);

    const sistemaTratado =
      textoSeguro(sistema, 150) ||
      "SafeScan Brasil";

    const urlSistemaTratada =
      textoSeguro(urlSistema, 500) ||
      "https://www.safescanbrasil.com.br";

    const tipoModeloTratado =
      textoSeguro(tipoModelo, 100) ||
      "padrao";

    const saudacao =
      `Olá${tstResponsavelTratado
        ? `, ${tstResponsavelTratado}`
        : ""}.`;

    const resumo =
      `${totalVencidos} vencido(s) e ${totalAVencer} a vencer.`;

    const dataEnvio =
      new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date());

    const corpoPadrao = [
      saudacao,
      "",
      "Segue aviso automático de documentos/treinamentos SST vencidos ou com vencimento previsto para os próximos 30 dias.",
      "",
      `Empresa: ${empresaTratada}`,
      `Resumo: ${resumo}`,
      "",
      linhas,
      "",
      "Solicitamos regularizar os documentos vencidos e programar a renovação dos próximos vencimentos para evitar bloqueio de atividade.",
      "",
      "Atenciosamente,",
      "Sistema de Controle SST QR",
    ].join("\n");

    const modeloRecebido =
      obterObjetoSeguro(modelo);

    const assuntoModelo =
      textoCabecalho(
        modeloRecebido.assunto,
        220,
      );

    const corpoModelo =
      textoSeguro(
        modeloRecebido.corpo,
        12000,
      );

    const remetenteModelo =
      textoCabecalho(
        modeloRecebido.remetenteNome,
        120,
      );

    if (
      corpoModelo &&
      !/\{\{\s*itens\s*\}\}/i.test(corpoModelo)
    ) {
      throw new Error(
        "O modelo personalizado deve conter a variável {{itens}}.",
      );
    }

    const valoresModelo: Record<string, string> = {
      saudacao,
      tst_responsavel: tstResponsavelTratado,
      empresa_nome: empresaTratada,
      total_vencidos: String(totalVencidos),
      total_a_vencer: String(totalAVencer),
      quantidade_itens: String(itensNormalizados.length),
      resumo,
      itens: linhas,
      sistema_nome: sistemaTratado,
      url_sistema: urlSistemaTratada,
      data_envio: dataEnvio,
    };

    const assuntoBase =
      assuntoModelo ||
      textoCabecalho(assunto, 220) ||
      `Aviso SST - ${empresaTratada || "documentos vencidos/a vencer"}`;

    const corpoBase =
      corpoModelo ||
      corpoPadrao;

    validarVariaveisModelo(
      assuntoBase,
      "assunto",
    );

    validarVariaveisModelo(
      corpoBase,
      "corpo",
    );

    const assuntoFinal =
      textoCabecalho(
        substituirVariaveisModelo(
          assuntoBase,
          valoresModelo,
        ),
        220,
      );

    const texto =
      substituirVariaveisModelo(
        corpoBase,
        valoresModelo,
      ).trim();

    if (!assuntoFinal) {
      throw new Error(
        "O assunto final do e-mail ficou vazio.",
      );
    }

    if (!texto) {
      throw new Error(
        "O corpo final do e-mail ficou vazio.",
      );
    }

    const nomeRemetente =
      (
        remetenteModelo ||
        "Sistema Controle SST QR"
      ).replace(/"/g, "'");

    const html =
      montarHtmlEmail(texto);

    await transporter.sendMail({
      from: `"${nomeRemetente}" <${gmailUser}>`,
      to: destinatario,
      subject: assuntoFinal,
      text: texto,
      html,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        mensagem: "E-mail enviado com sucesso.",
        tipoModelo: tipoModeloTratado,
        modeloPersonalizado: Boolean(
          assuntoModelo ||
          corpoModelo ||
          remetenteModelo,
        ),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        erro:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});