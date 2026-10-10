import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    BUCKETS_STORAGE_SST,
    avaliarSegurancaStorageSistema,
    calcularResumoSegurancaStorageSistema,
    calcularUsoStorageRealTenant,
} from "../../src/services/storageSegurancaService.js";

describe(
    "segurança e isolamento do Storage",
    () => {
        it(
            "mantém catálogo SST com classificação explícita para todos os buckets",
            () => {
                const avaliacoes =
                    avaliarSegurancaStorageSistema();

                expect(
                    BUCKETS_STORAGE_SST,
                ).toHaveLength(
                    10,
                );

                expect(
                    avaliacoes,
                ).toHaveLength(
                    14,
                );

                expect(
                    avaliacoes.find(
                        (item) =>
                            item.chave ===
                            "bucket-certificados-treinamentos",
                    )?.nivel,
                ).toBe(
                    "ok",
                );

                expect(
                    avaliacoes.find(
                        (item) =>
                            item.chave ===
                            "bucket-logos-empresas",
                    )?.nivel,
                ).toBe(
                    "info",
                );
            },
        );

        it(
            "prioriza estado crítico no resumo de segurança",
            () => {
                expect(
                    calcularResumoSegurancaStorageSistema([
                        {
                            nivel:
                                "alerta",
                        },
                        {
                            nivel:
                                "critico",
                        },
                    ]),
                ).toMatchObject({
                    texto:
                        "Crítico",
                    detalhe:
                        "1 ponto(s) crítico(s)",
                });
            },
        );

        it(
            "retorna atenção quando existem alertas sem item crítico",
            () => {
                expect(
                    calcularResumoSegurancaStorageSistema([
                        {
                            nivel:
                                "ok",
                        },
                        {
                            nivel:
                                "alerta",
                        },
                    ]),
                ).toMatchObject({
                    texto:
                        "Atenção",
                    detalhe:
                        "1 ponto(s) para conferir",
                });
            },
        );

        it(
            "retorna controlado quando não existem alertas ou críticos",
            () => {
                expect(
                    calcularResumoSegurancaStorageSistema([
                        {
                            nivel:
                                "ok",
                        },
                        {
                            nivel:
                                "info",
                        },
                    ]),
                ).toMatchObject({
                    texto:
                        "Controlado",
                    detalhe:
                        "Checklist operacional sem bloqueio",
                });
            },
        );

        it(
            "exige cliente e tenant antes de solicitar resumo de armazenamento",
            async () => {
                await expect(
                    calcularUsoStorageRealTenant(),
                ).rejects.toThrow(
                    "Cliente Supabase não informado",
                );

                await expect(
                    calcularUsoStorageRealTenant({
                        supabase: {},
                        tenantId:
                            " ",
                    }),
                ).rejects.toThrow(
                    "Tenant não informado",
                );
            },
        );

        it(
            "isola resumo por tenant, filtra bucket desconhecido e normaliza totais",
            async () => {
                const rpc =
                    vi
                        .fn()
                        .mockResolvedValue({
                            data: [
                                {
                                    bucket_id:
                                        "documentos-empresas",
                                    tamanho_bytes:
                                        1048576,
                                    total_arquivos:
                                        2,
                                    mime_types: [
                                        "application/pdf",
                                        "application/pdf",
                                    ],
                                },
                                {
                                    bucket_id:
                                        "certificados-treinamentos",
                                    tamanho_bytes:
                                        2097152,
                                    total_arquivos:
                                        3,
                                    mime_types: [
                                        "image/png",
                                        "application/pdf",
                                        "image/png",
                                    ],
                                },
                                {
                                    bucket_id:
                                        "bucket-nao-catalogado",
                                    tamanho_bytes:
                                        9999999,
                                    total_arquivos:
                                        99,
                                    mime_types: [
                                        "application/octet-stream",
                                    ],
                                },
                            ],
                            error:
                                null,
                        });

                const resultado =
                    await calcularUsoStorageRealTenant({
                        supabase: {
                            rpc,
                        },
                        tenantId:
                            " tenant-reg4a ",
                    });

                expect(
                    rpc,
                ).toHaveBeenCalledWith(
                    "resumo_storage_sst_tenant",
                    {
                        p_tenant_id:
                            "tenant-reg4a",
                    },
                );

                expect(
                    resultado,
                ).toMatchObject({
                    totalBytes:
                        3145728,
                    totalMb:
                        3,
                    arquivos:
                        5,
                    origem:
                        "rpc-resumo_storage_sst_tenant",
                    completo:
                        true,
                    tenantId:
                        "tenant-reg4a",
                });

                expect(
                    resultado.buckets,
                ).toHaveLength(
                    2,
                );

                expect(
                    resultado.buckets[0],
                ).toEqual({
                    bucket:
                        "certificados-treinamentos",
                    bytes:
                        2097152,
                    mb:
                        2,
                    arquivos:
                        3,
                    mimeTypes: [
                        "application/pdf",
                        "image/png",
                    ],
                });

                expect(
                    resultado.buckets[1],
                ).toEqual({
                    bucket:
                        "documentos-empresas",
                    bytes:
                        1048576,
                    mb:
                        1,
                    arquivos:
                        2,
                    mimeTypes: [
                        "application/pdf",
                    ],
                });
            },
        );
    },
);