import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    carregarConsultaPublicaQrService,
    normalizarConsultaPublicaComFoto,
    validarContatoEmergenciaQrService,
} from "../../src/services/consultaPublicaQrService.js";

describe(
    "consulta pública QR e PIN de emergência",
    () => {
        it(
            "recusa consulta pública sem token antes de chamar RPC",
            async () => {
                const rpc =
                    vi.fn();

                await expect(
                    carregarConsultaPublicaQrService({
                        supabase: {
                            rpc,
                        },
                        tokenQr:
                            "   ",
                    }),
                ).rejects.toThrow(
                    "Token do QR Code não informado.",
                );

                expect(
                    rpc,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "preserva foto final e normaliza campos públicos sem chamar Edge Function",
            async () => {
                const invoke =
                    vi.fn();

                const resultado =
                    await normalizarConsultaPublicaComFoto({
                        supabase: {
                            functions: {
                                invoke,
                            },
                        },
                        tokenQr:
                            "token-fallback",
                        dadosConsulta: {
                            colaborador: {
                                foto_url:
                                    "https://arquivos.example.test/foto.jpg",
                                foto_nome:
                                    "foto.jpg",
                                codigo_funcionario:
                                    "FUNC-10",
                                status_mobilizacao:
                                    "Mobilizado",
                                treinamentos_removidos:
                                    '[1,"2",0,"x"]',
                                treinamentos_adicionais:
                                    [3, "4", -1],
                            },
                        },
                    });

                expect(
                    invoke,
                ).not.toHaveBeenCalled();

                expect(
                    resultado.colaborador,
                ).toMatchObject({
                    fotoUrl:
                        "https://arquivos.example.test/foto.jpg",
                    fotoNome:
                        "foto.jpg",
                    codigoFuncionario:
                        "FUNC-10",
                    statusMobilizacao:
                        "Mobilizado",
                    treinamentosRemovidos:
                        [1, 2],
                    treinamentosAdicionais:
                        [3, 4],
                    token:
                        "token-fallback",
                });
            },
        );

        it(
            "troca caminho privado de foto por URL assinada retornada pela Edge Function mockada",
            async () => {
                const invoke =
                    vi
                        .fn()
                        .mockResolvedValue({
                            data: {
                                signedUrl:
                                    "https://signed.example.test/foto",
                            },
                            error:
                                null,
                        });

                const resultado =
                    await normalizarConsultaPublicaComFoto({
                        supabase: {
                            functions: {
                                invoke,
                            },
                        },
                        tokenQr:
                            "token-qr",
                        dadosConsulta: {
                            colaborador: {
                                foto_url:
                                    "tenant-a/fotos/usuario.jpg",
                            },
                        },
                    });

                expect(
                    invoke,
                ).toHaveBeenCalledWith(
                    "gerar-foto-colaborador-qr",
                    {
                        body: {
                            token:
                                "token-qr",
                        },
                    },
                );

                expect(
                    resultado.colaborador.fotoUrl,
                ).toBe(
                    "https://signed.example.test/foto",
                );
            },
        );

        it(
            "recusa validação de emergência sem PIN antes de chamar RPC",
            async () => {
                const rpc =
                    vi.fn();

                await expect(
                    validarContatoEmergenciaQrService({
                        supabase: {
                            rpc,
                        },
                        tokenQr:
                            "token-qr",
                        senha:
                            " ",
                    }),
                ).rejects.toThrow(
                    "Informe a senha/PIN de emergência.",
                );

                expect(
                    rpc,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "nega contato de emergência quando o backend mockado não autoriza",
            async () => {
                const rpc =
                    vi
                        .fn()
                        .mockResolvedValue({
                            data: {
                                ok:
                                    true,
                                autorizado:
                                    false,
                                mensagem:
                                    "PIN inválido.",
                            },
                            error:
                                null,
                        });

                await expect(
                    validarContatoEmergenciaQrService({
                        supabase: {
                            rpc,
                        },
                        tokenQr:
                            "token-qr",
                        senha:
                            "1234",
                    }),
                ).rejects.toThrow(
                    "PIN inválido.",
                );
            },
        );

        it(
            "libera contato de emergência somente com resposta explicitamente autorizada",
            async () => {
                const resposta = {
                    ok:
                        true,
                    autorizado:
                        true,
                    contato:
                        "Maria",
                };

                const rpc =
                    vi
                        .fn()
                        .mockResolvedValue({
                            data:
                                resposta,
                            error:
                                null,
                        });

                const resultado =
                    await validarContatoEmergenciaQrService({
                        supabase: {
                            rpc,
                        },
                        tokenQr:
                            " token-qr ",
                        senha:
                            " 4321 ",
                    });

                expect(
                    rpc,
                ).toHaveBeenCalledWith(
                    "validar_contato_emergencia_qr",
                    {
                        p_token:
                            "token-qr",
                        p_senha:
                            "4321",
                    },
                );

                expect(
                    resultado,
                ).toBe(
                    resposta,
                );
            },
        );
    },
);