import {
    Buffer,
} from "node:buffer";

import {
    ErroResolvedorEmail,
    resolverTransportadorEmailParaEnvio,
    type TransportadorEmailResolvido,
} from "../_shared/emailProvedorResolver.ts";

import type {
    AnexoPdf,
    AssinaturaInline,
    ConfiguracaoEnvio,
    PartePersistida,
    SupabaseClientAny,
} from "./types.ts";

import {
    ErroHttp,
    emailValido,
    escaparHtml,
    normalizarEmail,
    objetoSeguro,
    textoSeguro,
} from "./utils.ts";

export type CodigoErroEmailSeguro =
    | "SMTP_NAO_CONFIGURADO"
    | "ENVIO_RECUSADO"
    | "ENVIO_TIMEOUT"
    | "PROVEDOR_INDISPONIVEL"
    | "ERRO_INTERNO";

export class ErroEmailSeguro extends ErroHttp {
    codigo: CodigoErroEmailSeguro;

    constructor(
        status: number,
        codigo: CodigoErroEmailSeguro,
        mensagem: string,
    ) {
        super(
            status,
            `${codigo}: ${mensagem}`,
        );

        this.name =
            "ErroEmailSeguro";

        this.codigo =
            codigo;
    }
}

function criarErroEmailSeguro(
    codigo: CodigoErroEmailSeguro,
) {
    if (
        codigo ===
        "SMTP_NAO_CONFIGURADO"
    ) {
        return new ErroEmailSeguro(
            500,
            codigo,
            "Serviço de comunicação não configurado.",
        );
    }

    if (
        codigo ===
        "ENVIO_TIMEOUT"
    ) {
        return new ErroEmailSeguro(
            504,
            codigo,
            "O provedor de e-mail excedeu o tempo limite da operação.",
        );
    }

    if (
        codigo ===
        "ENVIO_RECUSADO"
    ) {
        return new ErroEmailSeguro(
            502,
            codigo,
            "O provedor de e-mail recusou a entrega da comunicação.",
        );
    }

    if (
        codigo ===
        "PROVEDOR_INDISPONIVEL"
    ) {
        return new ErroEmailSeguro(
            502,
            codigo,
            "Serviço de comunicação indisponível.",
        );
    }

    return new ErroEmailSeguro(
        500,
        "ERRO_INTERNO",
        "Não foi possível concluir a comunicação por e-mail.",
    );
}

function classificarErroResolvedor(
    erro: unknown,
): CodigoErroEmailSeguro {
    if (
        erro instanceof
        ErroResolvedorEmail
    ) {
        if (
            erro.codigo ===
                "PROVEDOR_NAO_CONFIGURADO" ||
            erro.codigo ===
                "PROVEDOR_CENTRAL_INVALIDO"
        ) {
            return "SMTP_NAO_CONFIGURADO";
        }

        if (
            erro.codigo ===
            "PROVEDOR_CENTRAL_INDISPONIVEL"
        ) {
            return "PROVEDOR_INDISPONIVEL";
        }
    }

    return "ERRO_INTERNO";
}

function classificarErroEnvio(
    erro: unknown,
): CodigoErroEmailSeguro {
    const registro =
        objetoSeguro(
            erro,
        );

    const descricao =
        [
            textoSeguro(
                registro.code,
                100,
            ),

            textoSeguro(
                registro.message,
                500,
            ),

            textoSeguro(
                registro.responseCode,
                100,
            ),

            textoSeguro(
                registro.command,
                100,
            ),
        ]
            .join(" ")
            .toLowerCase();

    if (
        descricao.includes(
            "timeout",
        ) ||
        descricao.includes(
            "etimedout",
        )
    ) {
        return "ENVIO_TIMEOUT";
    }

    if (
        descricao.includes(
            "535",
        ) ||
        descricao.includes(
            "eauth",
        ) ||
        descricao.includes(
            "invalid login",
        ) ||
        descricao.includes(
            "authentication",
        ) ||
        descricao.includes(
            "credential",
        )
    ) {
        return "SMTP_NAO_CONFIGURADO";
    }

    if (
        descricao.includes(
            "550",
        ) ||
        descricao.includes(
            "553",
        ) ||
        descricao.includes(
            "rejected",
        ) ||
        descricao.includes(
            "refused",
        )
    ) {
        return "ENVIO_RECUSADO";
    }

    if (
        descricao.includes(
            "econn",
        ) ||
        descricao.includes(
            "enotfound",
        ) ||
        descricao.includes(
            "eai_again",
        ) ||
        descricao.includes(
            "network",
        ) ||
        descricao.includes(
            "connect",
        )
    ) {
        return "PROVEDOR_INDISPONIVEL";
    }

    return "ERRO_INTERNO";
}

export type MensagemEmailMontada = {
    from: string;
    to: string[];
    cc?: string[];
    replyTo?: string;
    subject: string;
    text: string;
    html: string;
    attachments?: Array<
        Record<string, unknown>
    >;
};

type ItemEmail = {
    titulo: string;
    status: string;
};

const ORDEM_DOCUMENTOS = [
    "cnd federal",
    "crf fgts",
    "fgts",
    "cndt trabalhista",
    "cnd estadual",
    "cnd municipal",
    "falencia e concordata",
    "cadastro tce ceis",
] as const;

function sanitizarCabecalho(
    valor: unknown,
    rotulo: string,
    limite: number,
) {
    const texto =
        textoSeguro(
            valor,
            limite,
        );

    if (!texto) {
        throw new ErroHttp(
            422,
            `${rotulo} não pode ficar vazio.`,
        );
    }

    if (/[\r\n]/.test(texto)) {
        throw new ErroHttp(
            422,
            `${rotulo} contém quebra de linha não permitida.`,
        );
    }

    return texto;
}

function escaparNomeRemetente(
    valor: string,
) {
    return valor.replace(
        /(["\\])/g,
        "\\$1",
    );
}

function converterParaBuffer(
    bytes: Uint8Array,
) {
    const copia =
        new Uint8Array(
            bytes.byteLength,
        );

    copia.set(bytes);

    return Buffer.from(
        copia.buffer,
    );
}

function normalizarChaveDocumento(
    valor: string,
) {
    return valor
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            " ",
        )
        .trim();
}

function interpretarLinhaItem(
    linha: string,
): ItemEmail | null {
    const correspondencia =
        linha.match(
            /^\s*\d+\.\s+(.+?)(?:\s+[—-]\s+(.+))?\s*$/,
        );

    if (!correspondencia) {
        return null;
    }

    const titulo =
        textoSeguro(
            correspondencia[1],
            300,
        );

    if (!titulo) {
        return null;
    }

    return {
        titulo,

        status:
            textoSeguro(
                correspondencia[2],
                180,
            ) ||
            "Documento pendente",
    };
}

function ordenarItens(
    itens: ItemEmail[],
) {
    return itens
        .map(
            (
                item,
                indiceOriginal,
            ) => ({
                item,
                indiceOriginal,

                indiceOrdem:
                    ORDEM_DOCUMENTOS.indexOf(
                        normalizarChaveDocumento(
                            item.titulo,
                        ) as typeof ORDEM_DOCUMENTOS[number],
                    ),
            }),
        )
        .sort(
            (a, b) => {
                const ordemA =
                    a.indiceOrdem >= 0
                        ? a.indiceOrdem
                        : Number.MAX_SAFE_INTEGER;

                const ordemB =
                    b.indiceOrdem >= 0
                        ? b.indiceOrdem
                        : Number.MAX_SAFE_INTEGER;

                return (
                    ordemA - ordemB ||
                    a.indiceOriginal -
                        b.indiceOriginal
                );
            },
        )
        .map(
            (entrada) =>
                entrada.item,
        );
}

function ordenarItensNoCorpo(
    corpo: string,
) {
    const linhas =
        corpo
            .replace(
                /\r\n/g,
                "\n",
            )
            .split("\n");

    let indice = 0;

    while (indice < linhas.length) {
        if (
            interpretarLinhaItem(
                linhas[indice],
            ) === null
        ) {
            indice += 1;
            continue;
        }

        const inicio =
            indice;

        const itens: ItemEmail[] = [];

        while (indice < linhas.length) {
            const item =
                interpretarLinhaItem(
                    linhas[indice],
                );

            if (!item) {
                break;
            }

            itens.push(item);
            indice += 1;
        }

        const ordenados =
            ordenarItens(
                itens,
            );

        linhas.splice(
            inicio,
            itens.length,
            ...ordenados.map(
                (item, posicao) =>
                    `${posicao + 1}. ${item.titulo} — ${item.status}`,
            ),
        );
    }

    return linhas.join("\n");
}

function formatarTextoComDestaques(
    texto: string,
) {
    return escaparHtml(
        texto,
    )
        .replace(
            /(empresa\s+)([^,]+)(,)/i,
            "$1<strong style=\"font-weight:700;color:#1f2933;\">$2</strong>$3",
        )
        .replace(
            /(competência\s+)(\d{2}\/\d{4})/i,
            "$1<strong style=\"font-weight:700;color:#1f2933;\">$2</strong>",
        );
}

function montarListaHtml(
    itens: ItemEmail[],
) {
    const itensOrdenados =
        ordenarItens(
            itens,
        );

    return (
        "<div style=\"margin:24px 0 10px 0;\">" +
        "<div style=\"padding:0 0 8px 0;border-bottom:2px solid #16856f;" +
        "font-size:16px;line-height:22px;font-weight:700;color:#174f48;\">" +
        "Pendências identificadas" +
        "</div>" +
        "<ol style=\"margin:14px 0 0 22px;padding:0;color:#2f3b43;\">" +
        itensOrdenados
            .map(
                (item) =>
                    (
                        "<li style=\"margin:0 0 9px 0;padding-left:4px;" +
                        "font-size:14px;line-height:21px;\">" +
                        "<strong style=\"font-weight:700;color:#1f2933;\">" +
                        escaparHtml(
                            item.titulo,
                        ) +
                        "</strong>" +
                        "<span style=\"color:#9a5b08;font-weight:600;\">" +
                        " — " +
                        escaparHtml(
                            item.status,
                        ) +
                        "</span>" +
                        "</li>"
                    ),
            )
            .join("") +
        "</ol>" +
        "</div>"
    );
}

function montarHtmlCorpoEmail({
    corpo,
    assunto,
    informacaoParte,
    assinatura,
}: {
    corpo: string;
    assunto: string;
    informacaoParte: string;
    assinatura: AssinaturaInline | null;
}) {
    const blocos =
        corpo
            .replace(
                /\r\n/g,
                "\n",
            )
            .split(
                /\n\s*\n/,
            )
            .map(
                (bloco) =>
                    bloco.trim(),
            )
            .filter(Boolean);

    const htmlBlocos =
        blocos
            .map(
                (
                    bloco,
                    indice,
                ) => {
                    const linhas =
                        bloco
                            .split("\n")
                            .map(
                                (linha) =>
                                    linha.trim(),
                            )
                            .filter(Boolean);

                    const itens =
                        linhas
                            .map(
                                interpretarLinhaItem,
                            )
                            .filter(
                                (
                                    item,
                                ): item is ItemEmail =>
                                    item !== null,
                            );

                    if (
                        itens.length > 0 &&
                        itens.length ===
                            linhas.length
                    ) {
                        return montarListaHtml(
                            itens,
                        );
                    }

                    const texto =
                        linhas.join(" ");

                    const total =
                        texto.match(
                            /^Total de pendências identificadas:\s*(\d+)\.?$/i,
                        );

                    if (total) {
                        return (
                            "<p style=\"margin:22px 0 18px 0;padding:11px 0 11px 14px;" +
                            "border-left:3px solid #16856f;font-size:14px;line-height:21px;" +
                            "color:#2f3b43;\">" +
                            "<strong style=\"font-weight:700;color:#174f48;\">" +
                            "Total de pendências identificadas:" +
                            "</strong> " +
                            "<strong style=\"font-weight:700;color:#9a5b08;\">" +
                            escaparHtml(
                                total[1],
                            ) +
                            "</strong>" +
                            "</p>"
                        );
                    }

                    const saudacao =
                        indice === 0 &&
                        linhas.length === 1 &&
                        texto.length <= 100;

                    const solicitacao =
                        /^Solicitamos\s+/i.test(
                            texto,
                        );

                    const duvida =
                        /^Em caso de dúvida/i.test(
                            texto,
                        );

                    return (
                        "<p style=\"margin:" +
                        (
                            saudacao
                                ? "0 0 20px 0"
                                : solicitacao
                                    ? "22px 0 18px 0"
                                    : duvida
                                        ? "20px 0 0 0"
                                        : "0 0 18px 0"
                        ) +
                        ";font-size:" +
                        (
                            saudacao
                                ? "15px"
                                : duvida
                                    ? "13px"
                                    : "14px"
                        ) +
                        ";line-height:" +
                        (
                            saudacao
                                ? "22px"
                                : duvida
                                    ? "20px"
                                    : "22px"
                        ) +
                        ";color:" +
                        (
                            duvida
                                ? "#5d6b73"
                                : "#2f3b43"
                        ) +
                        ";font-weight:" +
                        (
                            saudacao
                                ? "600"
                                : "400"
                        ) +
                        ";\">" +
                        formatarTextoComDestaques(
                            texto,
                        ) +
                        "</p>"
                    );
                },
            )
            .join("");

    const htmlParte =
        informacaoParte
            ? (
                "<p style=\"margin:20px 0 0 0;font-size:12px;" +
                "line-height:18px;color:#64748b;\">" +
                escaparHtml(
                    informacaoParte,
                ) +
                "</p>"
            )
            : "";

    const htmlAssinatura =
        assinatura
            ? (
                "<div style=\"margin-top:28px;padding-top:22px;" +
                "border-top:1px solid #dfe5e8;\">" +
                "<img src=\"cid:" +
                escaparHtml(
                    assinatura.cid,
                ) +
                "\" alt=\"Assinatura\" " +
                "style=\"display:block;max-width:100%;height:auto;border:0;\">" +
                "</div>"
            )
            : "";

    return (
        "<!doctype html>" +
        "<html lang=\"pt-BR\">" +
        "<head>" +
        "<meta charset=\"utf-8\">" +
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
        "<title>" +
        escaparHtml(
            assunto,
        ) +
        "</title>" +
        "</head>" +
        "<body style=\"margin:0;padding:0;background-color:#ffffff;\">" +
        "<div style=\"max-width:720px;margin:0;padding:18px 12px;" +
        "font-family:Arial,Helvetica,sans-serif;color:#2f3b43;\">" +
        htmlBlocos +
        htmlParte +
        htmlAssinatura +
        "</div>" +
        "</body>" +
        "</html>"
    );
}

export async function criarTransportadorEmail(
    adminClient: SupabaseClientAny,
    nomeRemetenteFallback: string,
): Promise<TransportadorEmailResolvido> {
    try {
        return await resolverTransportadorEmailParaEnvio(
            adminClient,
            {
                nomeRemetenteFallback,
            },
        );
    } catch (
        erro
    ) {
        throw criarErroEmailSeguro(
            classificarErroResolvedor(
                erro,
            ),
        );
    }
}

export function fecharTransportadorEmail(
    provedorEmail: TransportadorEmailResolvido,
) {
    try {
        provedorEmail
            .transportador
            ?.close?.();
    } catch {
        // Fechamento best-effort. Nunca expor erro bruto do provedor.
    }
}

export function montarMensagemEmail({
    remetenteEmail,
    responderParaPadrao = null,
    configuracao,
    destinatarios,
    copias,
    parte,
    corpo,
    anexos,
    assinatura,
}: {
    remetenteEmail: string;
    responderParaPadrao?: string | null;
    configuracao: ConfiguracaoEnvio;
    destinatarios: string[];
    copias: string[];
    parte: PartePersistida;
    corpo: string;
    anexos: AnexoPdf[];
    assinatura: AssinaturaInline | null;
}): MensagemEmailMontada {
    const usuarioRemetente =
        normalizarEmail(
            remetenteEmail,
        );

    if (!emailValido(usuarioRemetente)) {
        throw new ErroHttp(
            500,
            "O usuário remetente é inválido.",
        );
    }

    const responderPara =
        normalizarEmail(
            configuracao.responderPara ||
            responderParaPadrao ||
            "",
        );

    if (
        responderPara &&
        !emailValido(
            responderPara,
        )
    ) {
        throw new ErroHttp(
            500,
            "O endereço de resposta é inválido.",
        );
    }

    if (destinatarios.length === 0) {
        throw new ErroHttp(
            422,
            "A mensagem não possui destinatários.",
        );
    }

    const nomeRemetente =
        sanitizarCabecalho(
            configuracao.nomeRemetente,
            "O nome do remetente",
            120,
        );

    const assunto =
        sanitizarCabecalho(
            parte.assunto,
            "O assunto",
            240,
        );

    const corpoSeguro =
        textoSeguro(
            corpo,
            10000,
        );

    if (!corpoSeguro) {
        throw new ErroHttp(
            422,
            "O corpo da mensagem não pode ficar vazio.",
        );
    }

    const corpoOrdenado =
        ordenarItensNoCorpo(
            corpoSeguro,
        );

    const informacaoParte =
        parte.total > 1
            ? (
                `Parte ${parte.numero} ` +
                `de ${parte.total}.`
            )
            : "";

    const texto =
        [
            corpoOrdenado,
            informacaoParte,
        ]
            .filter(Boolean)
            .join("\n\n");

    const html =
        montarHtmlCorpoEmail({
            corpo:
                corpoOrdenado,

            assunto,

            informacaoParte,

            assinatura,
        });

    const attachments: Array<
        Record<string, unknown>
    > =
        anexos.map(
            (anexo) => ({
                filename:
                    anexo.filename,

                content:
                    converterParaBuffer(
                        anexo.content,
                    ),

                contentType:
                    anexo.contentType,

                contentDisposition:
                    "attachment",
            }),
        );

    if (assinatura) {
        attachments.push({
            filename:
                assinatura.filename,

            content:
                converterParaBuffer(
                    assinatura.bytes,
                ),

            contentType:
                assinatura.contentType,

            contentDisposition:
                "inline",

            cid:
                assinatura.cid,
        });
    }

    return {
        from:
            (
                `"${escaparNomeRemetente(nomeRemetente)}" ` +
                `<${usuarioRemetente}>`
            ),

        to:
            destinatarios,

        ...(copias.length > 0
            ? {
                cc:
                    copias,
            }
            : {}),

        ...(responderPara
            ? {
                replyTo:
                    responderPara,
            }
            : {}),

        subject:
            assunto,

        text:
            texto,

        html,

        ...(attachments.length > 0
            ? {
                attachments,
            }
            : {}),
    };
}

export async function enviarParteEmail({
    provedorEmail,
    configuracao,
    destinatarios,
    copias,
    parte,
    corpo,
    anexos,
    assinatura,
}: {
    provedorEmail: TransportadorEmailResolvido;
    configuracao: ConfiguracaoEnvio;
    destinatarios: string[];
    copias: string[];
    parte: PartePersistida;
    corpo: string;
    anexos: AnexoPdf[];
    assinatura: AssinaturaInline | null;
}) {
    const mensagem =
        montarMensagemEmail({
            remetenteEmail:
                provedorEmail.remetenteEmail,

            responderParaPadrao:
                provedorEmail.responderParaPadrao,

            configuracao,
            destinatarios,
            copias,
            parte,
            corpo,
            anexos,
            assinatura,
        });

    try {
        const resultado =
            await provedorEmail
                .transportador
                .sendMail(
                    mensagem as unknown as
                        Record<string, unknown>,
                );

        return textoSeguro(
            resultado?.messageId,
            1000,
        );
    } catch (
        erro
    ) {
        throw criarErroEmailSeguro(
            classificarErroEnvio(
                erro,
            ),
        );
    }
}
