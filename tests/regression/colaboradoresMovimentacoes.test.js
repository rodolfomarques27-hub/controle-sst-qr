import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    demitirColaborador,
    obterMensagemErroMovimentacaoColaborador,
    readmitirColaborador,
    remobilizarColaborador,
    validarDataDemissaoReadmissao,
} from "../../src/services/colaboradoresMovimentacoesService.js";

const COLABORADOR_ID =
    "11111111-1111-4111-8111-111111111111";

describe(
    "movimentações do ciclo profissional do colaborador",
    () => {
        it(
            "aceita data formal de demissão nos dois formatos suportados",
            () => {
                expect(
                    validarDataDemissaoReadmissao({
                        dataDemissao:
                            "2026-09-30",
                    }),
                ).toBe(
                    "2026-09-30",
                );

                expect(
                    validarDataDemissaoReadmissao({
                        data_demissao:
                            " 2026-08-15 ",
                    }),
                ).toBe(
                    "2026-08-15",
                );
            },
        );

        it(
            "bloqueia readmissão histórica sem data formal de demissão",
            () => {
                let erro =
                    null;

                try {
                    validarDataDemissaoReadmissao();
                }
                catch (capturado) {
                    erro =
                        capturado;
                }

                expect(
                    erro,
                ).toBeInstanceOf(
                    Error,
                );

                expect(
                    erro?.code,
                ).toBe(
                    "READMISSAO_LEGADO_SEM_DATA_DEMISSAO",
                );
            },
        );

        it(
            "mapeia demissão para a RPC correta e normaliza o retorno",
            async () => {
                const rpc =
                    vi
                        .fn()
                        .mockResolvedValue({
                            data: {
                                colaborador: {
                                    id:
                                        COLABORADOR_ID,
                                },
                                movimentacao_id:
                                    "mov-001",
                                tipo_movimentacao:
                                    "DEMISSAO",
                            },
                            error:
                                null,
                        });

                const resultado =
                    await demitirColaborador({
                        supabase: {
                            rpc,
                        },
                        colaboradorId:
                            COLABORADOR_ID,
                        dataEvento:
                            "2026-10-10",
                        motivo:
                            "Encerramento do vínculo",
                    });

                expect(
                    rpc,
                ).toHaveBeenCalledWith(
                    "demitir_colaborador",
                    {
                        p_colaborador_id:
                            COLABORADOR_ID,
                        p_data_evento:
                            "2026-10-10",
                        p_motivo:
                            "Encerramento do vínculo",
                        p_observacao:
                            null,
                    },
                );

                expect(
                    resultado,
                ).toEqual({
                    colaborador: {
                        id:
                            COLABORADOR_ID,
                    },
                    movimentacaoId:
                        "mov-001",
                    tipoMovimentacao:
                        "DEMISSAO",
                });
            },
        );

        it(
            "impede remobilização para estado proibido antes de chamar a RPC",
            async () => {
                const rpc =
                    vi.fn();

                await expect(
                    remobilizarColaborador({
                        supabase: {
                            rpc,
                        },
                        colaboradorId:
                            COLABORADOR_ID,
                        dataEvento:
                            "2026-10-10",
                        motivo:
                            "Retorno à obra",
                        statusMobilizacaoNovo:
                            "Desmobilizado",
                    }),
                ).rejects.toMatchObject({
                    code:
                        "PARAMETRO_INVALIDO",
                });

                expect(
                    rpc,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "impede readmissão sem demissão formal antes de chamar a RPC",
            async () => {
                const rpc =
                    vi.fn();

                await expect(
                    readmitirColaborador({
                        supabase: {
                            rpc,
                        },
                        colaboradorId:
                            COLABORADOR_ID,
                        dataEvento:
                            "2026-10-10",
                        motivo:
                            "Novo vínculo",
                        statusMobilizacaoNovo:
                            "Mobilizado",
                    }),
                ).rejects.toMatchObject({
                    code:
                        "READMISSAO_LEGADO_SEM_DATA_DEMISSAO",
                });

                expect(
                    rpc,
                ).not.toHaveBeenCalled();
            },
        );

        it(
            "traduz erros estruturais, de permissão e genéricos sem mascarar mensagem válida",
            () => {
                expect(
                    obterMensagemErroMovimentacaoColaborador({
                        code:
                            "42P01",
                    }),
                ).toContain(
                    "estrutura de movimentações",
                );

                expect(
                    obterMensagemErroMovimentacaoColaborador({
                        code:
                            "42501",
                        message:
                            "Acesso negado pelo tenant.",
                    }),
                ).toBe(
                    "Acesso negado pelo tenant.",
                );

                expect(
                    obterMensagemErroMovimentacaoColaborador({}),
                ).toBe(
                    "Não foi possível concluir a movimentação do colaborador.",
                );
            },
        );
    },
);