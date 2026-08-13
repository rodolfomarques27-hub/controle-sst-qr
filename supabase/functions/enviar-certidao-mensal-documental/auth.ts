import {
    createClient,
} from "https://esm.sh/@supabase/supabase-js@2.45.4";

import type {
    SupabaseClientAny,
    UsuarioAutenticado,
} from "./types.ts";

import {
    ErroHttp,
    mensagemErro,
} from "./utils.ts";

export async function criarContextoAutenticacao(
    req: Request,
): Promise<{
    userClient: SupabaseClientAny;
    adminClient: SupabaseClientAny;
    usuario: UsuarioAutenticado;
}> {
    const supabaseUrl =
        Deno.env.get(
            "SUPABASE_URL",
        ) || "";

    const supabaseAnonKey =
        Deno.env.get(
            "SUPABASE_ANON_KEY",
        ) || "";

    const serviceRoleKey =
        Deno.env.get(
            "SUPABASE_SERVICE_ROLE_KEY",
        ) || "";

    if (
        !supabaseUrl ||
        !supabaseAnonKey ||
        !serviceRoleKey
    ) {
        throw new ErroHttp(
            500,
            "Credenciais do Supabase não configuradas na Edge Function.",
        );
    }

    const authorization =
        req.headers.get(
            "Authorization",
        ) || "";

    if (
        !authorization
            .toLowerCase()
            .startsWith(
                "bearer ",
            )
    ) {
        throw new ErroHttp(
            401,
            "Usuário não autenticado.",
        );
    }

    const userClient =
        createClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                global: {
                    headers: {
                        Authorization:
                            authorization,
                    },
                },

                auth: {
                    persistSession:
                        false,

                    autoRefreshToken:
                        false,
                },
            },
        );

    const adminClient =
        createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    persistSession:
                        false,

                    autoRefreshToken:
                        false,
                },
            },
        );

    const {
        data,
        error,
    } =
        await userClient.auth.getUser();

    if (
        error ||
        !data?.user?.id
    ) {
        throw new ErroHttp(
            401,
            error
                ? mensagemErro(error)
                : "Usuário não identificado.",
        );
    }

    return {
        userClient,
        adminClient,

        usuario: {
            id:
                data.user.id,

            email:
                data.user.email ||
                null,
        },
    };
}

export async function validarAcessoCompetencia(
    userClient: SupabaseClientAny,
    competenciaId: string,
) {
    const {
        data,
        error,
    } =
        await userClient.rpc(
            "certidao_mensal_usuario_pode_acessar_competencia",
            {
                p_competencia_id:
                    competenciaId,
            },
        );

    if (error) {
        throw new ErroHttp(
            403,
            mensagemErro(error),
        );
    }

    if (data !== true) {
        throw new ErroHttp(
            403,
            "Usuário sem acesso à competência informada.",
        );
    }
}