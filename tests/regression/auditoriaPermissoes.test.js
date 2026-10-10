import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    alternarUsuarioAutorizadoAuditoriaService,
    salvarUsuarioAutorizadoAuditoriaService,
    verificarAcessoAuditoriaService,
} from "../../src/services/auditoriaPermissoesService.js";

describe(
    "permissões da Auditoria de sistema",
    () => {
        it(
            "recusa autorização sem e-mail antes de acessar a tabela",
            async () => {
                const from =
                    vi.fn();

                await expect(
                    salvarUsuarioAutorizadoAuditoriaService({
                        supabase: {
                            from,
                        },
                        usuarioAutorizado: {
                            email:
                                " ",
                        },
                    }),
                ).rejects.toThrow(
                    "Informe o e-mail do usuário autorizado.",
                );

                expect(
                    from,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "normaliza e-mail e aplica perfil padrão ao autorizar usuário",
            async () => {
                const upsert =
                    vi
                        .fn()
                        .mockResolvedValue({
                            error:
                                null,
                        });

                const from =
                    vi
                        .fn()
                        .mockReturnValue({
                            upsert,
                        });

                const resultado =
                    await salvarUsuarioAutorizadoAuditoriaService({
                        supabase: {
                            from,
                        },
                        usuarioAutorizado: {
                            email:
                                " USUARIO@EXAMPLE.TEST ",
                            nome:
                                "Usuário Teste",
                            funcao:
                                "",
                            perfil:
                                "",
                        },
                    });

                expect(
                    resultado,
                ).toBe(
                    true,
                );

                expect(
                    from,
                ).toHaveBeenCalledWith(
                    "auditoria_usuarios_autorizados",
                );

                expect(
                    upsert,
                ).toHaveBeenCalledWith(
                    {
                        email:
                            "usuario@example.test",
                        nome:
                            "Usuário Teste",
                        funcao:
                            null,
                        ativo:
                            true,
                        perfil:
                            "usuario",
                        pode_acessar_auditoria:
                            true,
                    },
                    {
                        onConflict:
                            "email",
                    },
                );
            },
        );

        it(
            "impede usuário de bloquear o próprio acesso à Auditoria",
            async () => {
                const from =
                    vi.fn();

                await expect(
                    alternarUsuarioAutorizadoAuditoriaService({
                        supabase: {
                            from,
                        },
                        usuarioAutorizado: {
                            id:
                                "registro-1",
                            email:
                                "usuario@example.test",
                            pode_acessar_auditoria:
                                true,
                            acesso_global:
                                false,
                        },
                        usuario: {
                            email:
                                "USUARIO@example.test",
                        },
                    }),
                ).rejects.toThrow(
                    "Você não pode bloquear o próprio acesso",
                );

                expect(
                    from,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "impede bloqueio de administrador global pela tela operacional",
            async () => {
                const from =
                    vi.fn();

                await expect(
                    alternarUsuarioAutorizadoAuditoriaService({
                        supabase: {
                            from,
                        },
                        usuarioAutorizado: {
                            id:
                                "registro-2",
                            email:
                                "admin@example.test",
                            pode_acessar_auditoria:
                                true,
                            acesso_global:
                                true,
                        },
                        usuario: {
                            email:
                                "outro@example.test",
                        },
                    }),
                ).rejects.toThrow(
                    "Este usuário é administrador global.",
                );

                expect(
                    from,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "reativa acesso e usuário quando a permissão estava desligada",
            async () => {
                const eq =
                    vi
                        .fn()
                        .mockResolvedValue({
                            error:
                                null,
                        });

                const update =
                    vi
                        .fn()
                        .mockReturnValue({
                            eq,
                        });

                const from =
                    vi
                        .fn()
                        .mockReturnValue({
                            update,
                        });

                const resultado =
                    await alternarUsuarioAutorizadoAuditoriaService({
                        supabase: {
                            from,
                        },
                        usuarioAutorizado: {
                            id:
                                "registro-3",
                            email:
                                "usuario@example.test",
                            pode_acessar_auditoria:
                                false,
                            acesso_global:
                                false,
                        },
                        usuario: {
                            email:
                                "gestor@example.test",
                        },
                    });

                expect(
                    update,
                ).toHaveBeenCalledWith({
                    pode_acessar_auditoria:
                        true,
                    ativo:
                        true,
                });

                expect(
                    eq,
                ).toHaveBeenCalledWith(
                    "id",
                    "registro-3",
                );

                expect(
                    resultado,
                ).toEqual({
                    ok:
                        true,
                    novoAcessoAuditoria:
                        true,
                    payloadAtualizacao: {
                        pode_acessar_auditoria:
                            true,
                        ativo:
                            true,
                    },
                });
            },
        );

        it(
            "retorna false sem usuário autenticado e não consulta RPC",
            async () => {
                const rpc =
                    vi.fn();

                const resultado =
                    await verificarAcessoAuditoriaService({
                        supabase: {
                            rpc,
                        },
                        usuario:
                            null,
                    });

                expect(
                    resultado,
                ).toBe(
                    false,
                );

                expect(
                    rpc,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "converte resposta da RPC de autorização para booleano",
            async () => {
                const rpc =
                    vi
                        .fn()
                        .mockResolvedValue({
                            data:
                                1,
                            error:
                                null,
                        });

                const resultado =
                    await verificarAcessoAuditoriaService({
                        supabase: {
                            rpc,
                        },
                        usuario: {
                            email:
                                "usuario@example.test",
                        },
                    });

                expect(
                    rpc,
                ).toHaveBeenCalledWith(
                    "usuario_pode_acessar_auditoria",
                );

                expect(
                    resultado,
                ).toBe(
                    true,
                );
            },
        );

        it(
            "propaga erro da RPC de permissão sem transformar falha em acesso liberado",
            async () => {
                const rpc =
                    vi
                        .fn()
                        .mockResolvedValue({
                            data:
                                null,
                            error: {
                                message:
                                    "RPC indisponível.",
                            },
                        });

                await expect(
                    verificarAcessoAuditoriaService({
                        supabase: {
                            rpc,
                        },
                        usuario: {
                            email:
                                "usuario@example.test",
                        },
                    }),
                ).rejects.toThrow(
                    "RPC indisponível.",
                );
            },
        );
    },
);