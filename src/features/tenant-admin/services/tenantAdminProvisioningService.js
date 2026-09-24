import {
    montarOnboardingCompletoPreviewService,
    normalizarCnpjOnboarding,
    validarLogoOnboardingService,
} from "./tenantAdminOnboardingService.js";

const BUCKET_LOGOS =
    "logos-empresas";

const MAX_LOGO_BYTES =
    5 * 1024 * 1024;

const MAX_LOGO_DIMENSAO =
    1600;

const SENHA_MINUSCULAS =
    "abcdefghijkmnopqrstuvwxyz";

const SENHA_MAIUSCULAS =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";

const SENHA_NUMEROS =
    "23456789";

const SENHA_SIMBOLOS =
    "!@#$%*-_";

function texto(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function inteiroSeguro(
    valor
) {
    const numero =
        Number(
            valor
        );

    return Number.isInteger(
        numero
    )
        ? numero
        : 0;
}

function moedaCentavos(
    valor
) {
    const numero =
        Number(
            valor
        );

    if (
        !Number.isFinite(
            numero
        ) ||
        numero < 0
    ) {
        return 0;
    }

    return Math.round(
        numero
    );
}

function escolherCaractereSeguro(
    caracteres
) {
    const bytes =
        new Uint32Array(
            1
        );

    globalThis.crypto.getRandomValues(
        bytes
    );

    return caracteres[
        bytes[0] %
        caracteres.length
    ];
}

function embaralharSeguro(
    valores
) {
    const resultado =
        [
            ...valores,
        ];

    for (
        let index =
            resultado.length - 1;
        index > 0;
        index -= 1
    ) {
        const bytes =
            new Uint32Array(
                1
            );

        globalThis.crypto.getRandomValues(
            bytes
        );

        const destino =
            bytes[0] %
            (
                index + 1
            );

        const atual =
            resultado[index];

        resultado[index] =
            resultado[destino];

        resultado[destino] =
            atual;
    }

    return resultado;
}

export function gerarSenhaTemporariaProvisionamentoService() {
    if (
        !globalThis.crypto ||
        typeof globalThis.crypto.getRandomValues !==
            "function"
    ) {
        throw new Error(
            "Gerador seguro de senha indisponível neste navegador."
        );
    }

    const todos =
        (
            SENHA_MINUSCULAS +
            SENHA_MAIUSCULAS +
            SENHA_NUMEROS +
            SENHA_SIMBOLOS
        );

    const caracteres =
        [
            escolherCaractereSeguro(
                SENHA_MINUSCULAS
            ),

            escolherCaractereSeguro(
                SENHA_MAIUSCULAS
            ),

            escolherCaractereSeguro(
                SENHA_NUMEROS
            ),

            escolherCaractereSeguro(
                SENHA_SIMBOLOS
            ),
        ];

    while (
        caracteres.length <
        14
    ) {
        caracteres.push(
            escolherCaractereSeguro(
                todos
            )
        );
    }

    return embaralharSeguro(
        caracteres
    ).join("");
}

export function validarSenhaTemporariaProvisionamentoService(
    valor
) {
    const senha =
        String(
            valor ?? ""
        );

    if (
        senha.length < 10 ||
        senha.length > 64
    ) {
        throw new Error(
            "A senha temporária deve possuir entre 10 e 64 caracteres."
        );
    }

    if (
        !/[a-z]/.test(
            senha
        ) ||
        !/[A-Z]/.test(
            senha
        ) ||
        !/\d/.test(
            senha
        ) ||
        !/[!@#$%*_-]/.test(
            senha
        )
    ) {
        throw new Error(
            "A senha temporária deve conter letra maiúscula, minúscula, número e símbolo."
        );
    }

    return senha;
}

function validarConsultaCnpjParaProvisionamento({
    consultaCnpj,
    cnpj,
}) {
    if (
        !consultaCnpj ||
        typeof consultaCnpj !==
            "object"
    ) {
        throw new Error(
            "Consulte o CNPJ novamente antes de criar o cliente."
        );
    }

    const cnpjFormulario =
        normalizarCnpjOnboarding(
            cnpj
        );

    const cnpjConsulta =
        normalizarCnpjOnboarding(
            consultaCnpj.cnpj
        );

    if (
        !cnpjFormulario ||
        cnpjConsulta !==
            cnpjFormulario
    ) {
        throw new Error(
            "A validação cadastral pertence a outro CNPJ. Consulte novamente."
        );
    }

    const situacao =
        texto(
            consultaCnpj.situacaoCadastral
        ).toUpperCase();

    if (
        consultaCnpj.ativa !==
            true ||
        situacao !==
            "ATIVA"
    ) {
        throw new Error(
            "A criação do cliente exige CNPJ com situação cadastral ATIVA."
        );
    }

    const consultadoEm =
        new Date(
            consultaCnpj.consultadoEm
        );

    if (
        Number.isNaN(
            consultadoEm.getTime()
        )
    ) {
        throw new Error(
            "Data da consulta cadastral do CNPJ inválida."
        );
    }

    const agora =
        Date.now();

    const idade =
        agora -
        consultadoEm.getTime();

    const vinteQuatroHoras =
        24 * 60 * 60 * 1000;

    const cincoMinutos =
        5 * 60 * 1000;

    if (
        idade >
            vinteQuatroHoras ||
        idade <
            -cincoMinutos
    ) {
        throw new Error(
            "A consulta do CNPJ expirou. Consulte novamente antes de criar o cliente."
        );
    }

    return {
        cnpj:
            cnpjConsulta,

        situacaoCadastral:
            situacao,

        fonte:
            texto(
                consultaCnpj.fonte
            ),

        consultadoEm:
            consultadoEm.toISOString(),

        razaoSocial:
            texto(
                consultaCnpj.razaoSocial
            ),

        nomeFantasia:
            texto(
                consultaCnpj.nomeFantasia
            ),

        cep:
            texto(
                consultaCnpj.cep
            ),

        logradouro:
            texto(
                consultaCnpj.logradouro
            ),

        numero:
            texto(
                consultaCnpj.numero
            ),

        complemento:
            texto(
                consultaCnpj.complemento
            ),

        bairro:
            texto(
                consultaCnpj.bairro
            ),

        cidade:
            texto(
                consultaCnpj.cidade
            ),

        uf:
            texto(
                consultaCnpj.uf
            ).toUpperCase(),

        naturezaJuridica:
            texto(
                consultaCnpj.naturezaJuridica
            ),

        dataSituacaoCadastral:
            texto(
                consultaCnpj.dataSituacaoCadastral
            ),
    };
}

export function montarPayloadOnboardingCompletoProvisionamentoService({
    formulario,
    arquivoLogo,
    consultaCnpj,
} = {}) {
    const preview =
        montarOnboardingCompletoPreviewService({
            formulario,
            arquivoLogo,
        });

    const validacaoCnpj =
        validarConsultaCnpjParaProvisionamento({
            consultaCnpj,
            cnpj:
                preview.empresa.cnpj,
        });

    const payload =
        {
            nomeTenant:
                preview.provisionamento.p_nome_tenant,

            slug:
                preview.provisionamento.p_slug,

            hostname:
                preview.provisionamento.p_hostname,

            empresa:
                {
                    nome:
                        preview.empresa.nome,

                    razaoSocial:
                        preview.empresa.razaoSocial,

                    cnpj:
                        preview.empresa.cnpj,

                    responsavel:
                        preview.empresa.responsavel,

                    email:
                        preview.empresa.email,

                    telefone:
                        preview.empresa.telefone,

                    tipo:
                        preview.empresa.empresaTipo,

                    cep:
                        preview.empresa.cep,

                    logradouro:
                        preview.empresa.logradouro,

                    numeroEndereco:
                        preview.empresa.numeroEndereco,

                    complemento:
                        preview.empresa.complemento,

                    bairro:
                        preview.empresa.bairro,

                    cidade:
                        preview.empresa.cidade,

                    uf:
                        preview.empresa.uf,
                },

            cnpjValidacao:
                validacaoCnpj,

            comercial:
                {
                    modeloCobranca:
                        preview.comercial.modeloCobranca,

                    valorBaseCentavos:
                        moedaCentavos(
                            preview.comercial.valorBaseCentavos
                        ),

                    valorColaboradorCentavos:
                        moedaCentavos(
                            preview.comercial.valorColaboradorCentavos
                        ),

                    colaboradoresIncluidos:
                        inteiroSeguro(
                            preview.comercial.colaboradoresIncluidos
                        ),

                    armazenamentoIncluidoGb:
                        Number(
                            preview.comercial.armazenamentoIncluidoGb ||
                            0
                        ),

                    valorGbExcedenteCentavos:
                        moedaCentavos(
                            preview.comercial.valorGbExcedenteCentavos
                        ),

                    diaFechamento:
                        inteiroSeguro(
                            preview.comercial.diaFechamento
                        ),

                    diaVencimento:
                        inteiroSeguro(
                            preview.comercial.diaVencimento
                        ),

                    inicioVigencia:
                        preview.comercial.inicioVigencia,

                    financeiroNome:
                        preview.comercial.financeiroNome,

                    financeiroEmail:
                        preview.comercial.financeiroEmail,

                    financeiroTelefone:
                        preview.comercial.financeiroTelefone,
                },
        };

    return {
        preview,
        payload,
    };
}

async function converterImagemParaPng(
    arquivo
) {
    validarLogoOnboardingService(
        arquivo
    );

    if (
        arquivo.type ===
        "image/png"
    ) {
        if (
            arquivo.size >
            MAX_LOGO_BYTES
        ) {
            throw new Error(
                "O logo em PNG ultrapassa o limite de 5 MB."
            );
        }

        return arquivo;
    }

    if (
        typeof globalThis.createImageBitmap !==
            "function" ||
        !globalThis.document
    ) {
        throw new Error(
            "Conversão do logo para PNG indisponível neste navegador."
        );
    }

    let bitmap;

    try {
        bitmap =
            await globalThis.createImageBitmap(
                arquivo
            );
    }
    catch {
        throw new Error(
            "Não foi possível abrir o logo selecionado."
        );
    }

    try {
        const larguraOriginal =
            bitmap.width;

        const alturaOriginal =
            bitmap.height;

        if (
            !larguraOriginal ||
            !alturaOriginal
        ) {
            throw new Error(
                "Dimensões do logo inválidas."
            );
        }

        const maiorDimensao =
            Math.max(
                larguraOriginal,
                alturaOriginal
            );

        const escala =
            Math.min(
                1,
                MAX_LOGO_DIMENSAO /
                maiorDimensao
            );

        const largura =
            Math.max(
                1,
                Math.round(
                    larguraOriginal *
                    escala
                )
            );

        const altura =
            Math.max(
                1,
                Math.round(
                    alturaOriginal *
                    escala
                )
            );

        const canvas =
            globalThis.document.createElement(
                "canvas"
            );

        canvas.width =
            largura;

        canvas.height =
            altura;

        const contexto =
            canvas.getContext(
                "2d"
            );

        if (!contexto) {
            throw new Error(
                "Não foi possível preparar o logo."
            );
        }

        contexto.clearRect(
            0,
            0,
            largura,
            altura
        );

        contexto.drawImage(
            bitmap,
            0,
            0,
            largura,
            altura
        );

        const blob =
            await new Promise(
                (
                    resolve,
                    reject
                ) => {
                    canvas.toBlob(
                        (
                            resultado
                        ) => {
                            if (!resultado) {
                                reject(
                                    new Error(
                                        "Falha ao converter o logo para PNG."
                                    )
                                );

                                return;
                            }

                            resolve(
                                resultado
                            );
                        },
                        "image/png"
                    );
                }
            );

        if (
            blob.size >
            MAX_LOGO_BYTES
        ) {
            throw new Error(
                "O logo convertido ultrapassa o limite de 5 MB. Use uma imagem menor."
            );
        }

        return blob;
    }
    finally {
        if (
            bitmap &&
            typeof bitmap.close ===
                "function"
        ) {
            bitmap.close();
        }
    }
}

export async function prepararLogoPngProvisionamentoService(
    arquivo
) {
    return converterImagemParaPng(
        arquivo
    );
}

export async function provisionarTenantCompletoService({
    supabase,
    payload,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (
        !payload ||
        typeof payload !==
            "object"
    ) {
        throw new Error(
            "Payload do onboarding não informado."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_provisionar_tenant_onboarding_completo",
            {
                p_payload:
                    payload,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível criar o cliente."
        );
    }

    if (
        !data?.ok ||
        !data?.tenant?.id ||
        !data?.empresaInicial?.id
    ) {
        throw new Error(
            "O provisionamento retornou uma resposta incompleta."
        );
    }

    return data;
}

export async function uploadLogoTenantProvisionamentoService({
    supabase,
    tenantId,
    logoPng,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const tenant =
        texto(
            tenantId
        );

    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            tenant
        )
    ) {
        throw new Error(
            "Tenant inválido para upload do logo."
        );
    }

    if (!logoPng) {
        throw new Error(
            "Logo não preparado."
        );
    }

    const path =
        `${tenant}/branding/login/logo-contratante.png`;

    const {
        data,
        error,
    } =
        await supabase.storage
            .from(
                BUCKET_LOGOS
            )
            .upload(
                path,
                logoPng,
                {
                    cacheControl:
                        "3600",

                    contentType:
                        "image/png",

                    upsert:
                        true,
                }
            );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível enviar o logo do cliente."
        );
    }

    const {
        data:
            publicData,
    } =
        supabase.storage
            .from(
                BUCKET_LOGOS
            )
            .getPublicUrl(
                path
            );

    return {
        bucket:
            BUCKET_LOGOS,

        path:
            data?.path ||
            path,

        publicUrl:
            publicData?.publicUrl ||
            "",
    };
}

export async function criarResponsavelTenantProvisionamentoService({
    supabase,
    tenantId,
    empresaId,
    nome,
    email,
    funcao,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }


    const {
        data,
        error,
    } =
        await supabase.functions.invoke(
            "admin-criar-login-app",
            {
                body:
                    {
                        tenantId:
                            tenantId,

                        empresaId:
                            empresaId,

                        nome:
                            texto(
                                nome
                            ),

                        email:
                            texto(
                                email
                            ).toLowerCase(),

                        funcao:
                            texto(
                                funcao
                            ) ||
                            "Responsável pelo SafeScan",

                        perfil:
                            "administrador",

                        papel:
                            "administrador",

                        ativo:
                            true,

                        bloqueado:
                            false,

                        acessoGlobal:
                            false,


                        resetarSenhaTemporaria:
                            false,

                        permissoes:
                            {},

                        observacao:
                            "Responsável inicial criado pelo onboarding do Painel Mestre SafeScan.",
                    },
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível criar o acesso do responsável."
        );
    }

    if (
        !data?.ok ||
        !data?.usuario?.id
    ) {
        throw new Error(
            data?.erro ||
            "A criação do acesso retornou uma resposta incompleta."
        );
    }

    if (
        data?.escopo !==
        "tenant"
    ) {
        throw new Error(
            "O acesso foi criado fora do escopo tenant esperado."
        );
    }

    return data;
}

function criarErroParcial({
    etapa,
    mensagem,
    resultadoParcial,
}) {
    const erro =
        new Error(
            mensagem
        );

    erro.parcial =
        true;

    erro.etapa =
        etapa;

    erro.resultadoParcial =
        resultadoParcial;

    return erro;
}

export async function executarOnboardingOperacionalService({
    supabase,
    formulario,
    arquivoLogo,
    consultaCnpj,
    onEtapa,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }


    onEtapa?.(
        "Validando dados..."
    );

    const {
        payload,
        preview,
    } =
        montarPayloadOnboardingCompletoProvisionamentoService({
            formulario,
            arquivoLogo,
            consultaCnpj,
        });

    /*
     * Preparar/converter o arquivo ANTES da primeira mutation.
     * Assim, erro de imagem não deixa tenant parcial.
     */
    onEtapa?.(
        "Preparando logo..."
    );

    const logoPng =
        await prepararLogoPngProvisionamentoService(
            arquivoLogo
        );

    let provisionamento =
        null;

    let logo =
        null;

    let acesso =
        null;

    onEtapa?.(
        "Criando cliente..."
    );

    try {
        provisionamento =
            await provisionarTenantCompletoService({
                supabase,
                payload,
            });
    }
    catch (error) {
        throw new Error(
            error?.message ||
            "Não foi possível criar o cliente."
        );
    }

    const tenantId =
        provisionamento.tenant.id;

    const empresaId =
        provisionamento.empresaInicial.id;

    onEtapa?.(
        "Enviando identidade visual..."
    );

    try {
        logo =
            await uploadLogoTenantProvisionamentoService({
                supabase,
                tenantId,
                logoPng,
            });
    }
    catch (error) {
        throw criarErroParcial({
            etapa:
                "logo",

            mensagem:
                (
                    "O cliente foi criado como rascunho, mas o logo não pôde ser concluído. " +
                    "Não clique em Criar cliente novamente. " +
                    (
                        error?.message ||
                        ""
                    )
                ).trim(),

            resultadoParcial:
                {
                    provisionamento,
                    logo:
                        null,
                    acesso:
                        null,
                },
        });
    }

    onEtapa?.(
        "Criando responsável pelo sistema..."
    );

    try {
        acesso =
            await criarResponsavelTenantProvisionamentoService({
                supabase,
                tenantId,
                empresaId,
                nome:
                    formulario.adminNome,
                email:
                    formulario.adminEmail,
                funcao:
                    formulario.adminFuncao,
            });
    }
    catch (error) {
        throw criarErroParcial({
            etapa:
                "responsavel",

            mensagem:
                (
                    "O cliente e o logo foram criados, mas o acesso do responsável não pôde ser concluído. " +
                    "Não clique em Criar cliente novamente. " +
                    (
                        error?.message ||
                        ""
                    )
                ).trim(),

            resultadoParcial:
                {
                    provisionamento,
                    logo,
                    acesso:
                        null,
                },
        });
    }

    onEtapa?.(
        "Finalizando..."
    );

    return {
        ok:
            true,

        preview,

        provisionamento,

        logo,

        acesso,

        comunicacao:
            {
                preparada:
                    true,

                enviada:
                    false,

                motivo:
                    "O convite seguro de primeiro acesso será enviado após a ativação do tenant.",

                destinatario:
                    formulario.adminEmail,

                orientacao:
                    "Após ativar o cliente, use Enviar convite no Painel Mestre para que o Administrador do Cliente defina a própria senha.",
            },
    };
}