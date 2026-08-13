import type {
    JsonRecord,
} from "./types.ts";

export const corsHeaders = {
    "Access-Control-Allow-Origin":
        "*",

    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",

    "Access-Control-Allow-Methods":
        "POST, OPTIONS",
};

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const IDEMPOTENCIA_PATTERN =
    /^[A-Za-z0-9:_-]{16,120}$/;

const EMAIL_PATTERN =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ErroHttp extends Error {
    status: number;

    constructor(
        status: number,
        message: string,
    ) {
        super(message);

        this.name =
            "ErroHttp";

        this.status =
            status;
    }
}

export function respostaJson(
    status: number,
    body: JsonRecord,
) {
    return new Response(
        JSON.stringify(body),
        {
            status,

            headers: {
                ...corsHeaders,

                "Content-Type":
                    "application/json; charset=utf-8",
            },
        },
    );
}

export function objetoSeguro(
    valor: unknown,
): JsonRecord {
    if (
        valor &&
        typeof valor === "object" &&
        !Array.isArray(valor)
    ) {
        return valor as JsonRecord;
    }

    return {};
}

export function textoSeguro(
    valor: unknown,
    limite = 10000,
) {
    return String(
        valor ?? "",
    )
        .trim()
        .slice(
            0,
            limite,
        );
}

export function numeroInteiro(
    valor: unknown,
    padrao = 0,
) {
    const numero =
        Number(valor);

    return Number.isFinite(numero)
        ? Math.trunc(numero)
        : padrao;
}

export function booleanoSeguro(
    valor: unknown,
    padrao = false,
) {
    return typeof valor === "boolean"
        ? valor
        : padrao;
}

export function listaTexto(
    valor: unknown,
) {
    if (!Array.isArray(valor)) {
        return [];
    }

    return valor
        .map(
            (item) =>
                textoSeguro(
                    item,
                    500,
                ),
        )
        .filter(Boolean);
}

export function normalizarEmail(
    valor: unknown,
) {
    return textoSeguro(
        valor,
        254,
    ).toLowerCase();
}

export function emailValido(
    valor: unknown,
) {
    const email =
        normalizarEmail(valor);

    return (
        email.length >= 3 &&
        EMAIL_PATTERN.test(email)
    );
}

export function normalizarListaEmails(
    valor: unknown,
    limite: number,
    rotulo: string,
) {
    const resultado: string[] =
        [];

    const vistos =
        new Set<string>();

    for (const item of listaTexto(valor)) {
        const email =
            normalizarEmail(item);

        if (!emailValido(email)) {
            throw new ErroHttp(
                422,
                `Endereço inválido em ${rotulo}: ${item}.`,
            );
        }

        if (!vistos.has(email)) {
            vistos.add(email);
            resultado.push(email);
        }
    }

    if (resultado.length > limite) {
        throw new ErroHttp(
            422,
            `${rotulo} permite no máximo ${limite} endereços.`,
        );
    }

    return resultado;
}

export async function lerSolicitacao(
    req: Request,
) {
    let body: JsonRecord;

    try {
        body =
            objetoSeguro(
                await req.json(),
            );
    } catch {
        throw new ErroHttp(
            400,
            "Corpo JSON inválido.",
        );
    }

    const camposPermitidos =
        new Set([
            "competenciaId",
            "chaveIdempotencia",
        ]);

    const camposInesperados =
        Object.keys(body)
            .filter(
                (campo) =>
                    !camposPermitidos.has(
                        campo,
                    ),
            );

    if (camposInesperados.length > 0) {
        throw new ErroHttp(
            400,
            `Campos não permitidos: ${camposInesperados.join(", ")}.`,
        );
    }

    const competenciaId =
        textoSeguro(
            body.competenciaId,
            50,
        );

    const chaveIdempotencia =
        textoSeguro(
            body.chaveIdempotencia,
            120,
        );

    if (!UUID_PATTERN.test(competenciaId)) {
        throw new ErroHttp(
            400,
            "Competência persistida inválida.",
        );
    }

    if (
        !IDEMPOTENCIA_PATTERN.test(
            chaveIdempotencia,
        )
    ) {
        throw new ErroHttp(
            400,
            "Chave de idempotência inválida.",
        );
    }

    return {
        competenciaId,
        chaveIdempotencia,
    };
}

export function formatarCompetencia(
    valor: unknown,
) {
    const texto =
        textoSeguro(
            valor,
            20,
        );

    const correspondencia =
        /^(\d{4})-(\d{2})-\d{2}$/.exec(
            texto,
        );

    if (!correspondencia) {
        return texto;
    }

    return (
        `${correspondencia[2]}/` +
        correspondencia[1]
    );
}

export function renderizarModelo(
    modelo: string,
    variaveis: Record<string, string>,
) {
    return modelo.replace(
        /{{\s*([a-z0-9_]+)\s*}}/gi,
        (
            original,
            chave: string,
        ) =>
            Object.prototype.hasOwnProperty.call(
                variaveis,
                chave,
            )
                ? variaveis[chave]
                : original,
    );
}

export function escaparHtml(
    valor: unknown,
) {
    return String(
        valor ?? "",
    )
        .replace(
            /&/g,
            "&amp;",
        )
        .replace(
            /</g,
            "&lt;",
        )
        .replace(
            />/g,
            "&gt;",
        )
        .replace(
            /"/g,
            "&quot;",
        )
        .replace(
            /'/g,
            "&#039;",
        );
}

export function nomeArquivoSeguro(
    nome: unknown,
    ordem: number,
) {
    const base =
        textoSeguro(
            nome,
            170,
        )
            .normalize("NFKD")
            .replace(
                /[\u0300-\u036f]/g,
                "",
            )
            .replace(
                /[^A-Za-z0-9._ -]/g,
                "_",
            )
            .replace(
                /\s+/g,
                " ",
            )
            .trim() ||
        `documento-${ordem}.pdf`;

    const comExtensao =
        /\.pdf$/i.test(base)
            ? base
            : `${base}.pdf`;

    return (
        `${String(ordem).padStart(2, "0")} - ` +
        comExtensao
    );
}

export async function sha256Hex(
    bytes: Uint8Array,
) {
    const copia =
        new Uint8Array(
            bytes.byteLength,
        );

    copia.set(bytes);

    const resumo =
        await crypto.subtle.digest(
            "SHA-256",
            copia.buffer,
        );

    return Array.from(
        new Uint8Array(resumo),
    )
        .map(
            (byte) =>
                byte
                    .toString(16)
                    .padStart(
                        2,
                        "0",
                    ),
        )
        .join("");
}

export function mensagemErro(
    error: unknown,
) {
    if (error instanceof Error) {
        return (
            textoSeguro(
                error.message,
                2000,
            ) ||
            "Erro não identificado."
        );
    }

    const registro =
        objetoSeguro(error);

    return (
        textoSeguro(
            registro.message ??
                registro.error ??
                error,
            2000,
        ) ||
        "Erro não identificado."
    );
}

export function agoraIso() {
    return new Date().toISOString();
}