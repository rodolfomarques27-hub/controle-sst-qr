// supabase/functions/rapid-api/index.ts
// Função usada pelo App para envio automático de alertas SST por Gmail.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { para, assunto, empresa, tstResponsavel, itens = [] } = await req.json();
    const destinatario = String(para || "")
      .split(/[;,]/)
      .map((email) => email.trim())
      .filter(Boolean)
      .join(",");

    if (!destinatario) throw new Error("E-mail do destinatário/TST não informado.");
    if (!Array.isArray(itens) || itens.length === 0) {
      throw new Error("Nenhum documento/treinamento foi informado para o alerta.");
    }

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Credenciais GMAIL_USER e GMAIL_APP_PASSWORD não configuradas no Supabase.");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    const totalVencidos = itens.filter((item: any) => Number(item.dias) < 0).length;
    const totalAVencer = itens.filter((item: any) => Number(item.dias) >= 0).length;

    const linhas = itens
      .map((item: any, index: number) => {
        const dias = Number(item.dias);
        const situacao = dias < 0 ? `VENCIDO HÁ ${Math.abs(dias)} DIA(S)` : `A VENCER EM ${dias} DIA(S)`;

        return [
          `${index + 1}. COLABORADOR: ${item.colaborador || "-"}`,
          `Código: ${item.codigo || "-"}`,
          `Função: ${item.funcao || "-"}`,
          `Situação na obra: ${item.situacaoObra || "-"}`,
          `Documento/Treinamento: ${item.treinamento || "-"}`,
          `Data de elaboração/realização: ${item.realizacao || "Não informada"}`,
          `Data de vencimento: ${item.vencimento || "Não informada"}`,
          `Status: ${situacao}`,
          `Arquivo: ${item.arquivo || "Não informado"}`,
        ].join("\n");
      })
      .join("\n\n");

    const texto = [
      `Olá${tstResponsavel ? `, ${tstResponsavel}` : ""}.`,
      "",
      "Segue aviso automático de documentos/treinamentos SST vencidos ou com vencimento previsto para os próximos 30 dias.",
      "",
      `Empresa: ${empresa || "Empresa não informada"}`,
      `Resumo: ${totalVencidos} vencido(s) e ${totalAVencer} a vencer.`,
      "",
      linhas,
      "",
      "Solicitamos regularizar os documentos vencidos e programar a renovação dos próximos vencimentos para evitar bloqueio de atividade.",
      "",
      "Atenciosamente,",
      "Sistema de Controle SST QR",
    ].join("\n");

    const html = texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>")
      .replace(/VENCIDO HÁ/g, "<strong style='color:#b91c1c'>VENCIDO HÁ</strong>")
      .replace(/A VENCER EM/g, "<strong style='color:#c2410c'>A VENCER EM</strong>");

    await transporter.sendMail({
      from: `"Sistema Controle SST QR" <${gmailUser}>`,
      to: destinatario,
      subject: assunto || `Aviso SST - ${empresa || "documentos vencidos/a vencer"}`,
      text: texto,
      html,
    });

    return new Response(JSON.stringify({ ok: true, mensagem: "E-mail enviado com sucesso." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, erro: error instanceof Error ? error.message : String(error) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
