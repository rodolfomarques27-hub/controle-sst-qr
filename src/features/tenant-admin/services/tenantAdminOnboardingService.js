import {
    montarProvisionamentoTenantRascunhoPayload,
} from "./tenantAdminService.js";

const MAX_LOGO_BYTES =
    5 * 1024 * 1024;

const TIPOS_LOGO_PERMITIDOS =
    new Set([
        "image/png",
        "image/jpeg",
        "image/webp",
    ]);

const MODELOS_COBRANCA =
    new Set([
        "mensalidade_fixa",
        "por_colaborador",
        "base_mais_colaborador",
    ]);

function texto(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function somenteDigitos(
    valor
) {
    return texto(
        valor
    ).replace(
        /\D/g,
        ""
    );
}

function emailValido(
    valor
) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        texto(
            valor
        ).toLowerCase()
    );
}

function telefoneValido(
    valor
) {
    const telefone =
        somenteDigitos(
            valor
        );

    if (
        telefone.length <
            10 ||
        telefone.length >
            11
    ) {
        return false;
    }

    if (
        /^(\d)\1+$/.test(
            telefone
        )
    ) {
        return false;
    }

    return true;
}

function calcularDigitoCnpj(
    base,
    pesos
) {
    const soma =
        base
            .split("")
            .reduce(
                (
                    total,
                    digito,
                    index
                ) =>
                    total +
                    (
                        Number(
                            digito
                        ) *
                        pesos[index]
                    ),
                0
            );

    const resto =
        soma % 11;

    return resto < 2
        ? 0
        : 11 - resto;
}

export function normalizarCnpjOnboarding(
    valor
) {
    return somenteDigitos(
        valor
    );
}

export function cnpjOnboardingValido(
    valor
) {
    const cnpj =
        normalizarCnpjOnboarding(
            valor
        );

    if (
        !/^\d{14}$/.test(
            cnpj
        )
    ) {
        return false;
    }

    if (
        /^(\d)\1{13}$/.test(
            cnpj
        )
    ) {
        return false;
    }

    const base12 =
        cnpj.slice(
            0,
            12
        );

    const primeiro =
        calcularDigitoCnpj(
            base12,
            [
                5,
                4,
                3,
                2,
                9,
                8,
                7,
                6,
                5,
                4,
                3,
                2,
            ]
        );

    const base13 =
        base12 +
        String(
            primeiro
        );

    const segundo =
        calcularDigitoCnpj(
            base13,
            [
                6,
                5,
                4,
                3,
                2,
                9,
                8,
                7,
                6,
                5,
                4,
                3,
                2,
            ]
        );

    return (
        cnpj.slice(
            12
        ) ===
        String(
            primeiro
        ) +
        String(
            segundo
        )
    );
}

export function validarClienteOnboardingService({
    nomeTenant,
    slug,
} = {}) {
    return montarProvisionamentoTenantRascunhoPayload({
        nomeTenant,
        slug,
        empresaNome:
            "Empresa temporária",
        empresaTipo:
            "Contratante",
    });
}

export function validarEmpresaOnboardingService({
    empresaNome,
    razaoSocial,
    cnpj,
    responsavel,
    email,
    telefone,
    empresaTipo,
    cep,
    logradouro,
    numeroEndereco,
    complemento,
    bairro,
    cidade,
    uf,
} = {}) {
    const nome =
        texto(
            empresaNome
        );

    const razao =
        texto(
            razaoSocial
        );

    const documento =
        normalizarCnpjOnboarding(
            cnpj
        );

    const responsavelNormalizado =
        texto(
            responsavel
        );

    const emailNormalizado =
        texto(
            email
        ).toLowerCase();

    const cepNormalizado =
        somenteDigitos(
            cep
        );

    const logradouroNormalizado =
        texto(
            logradouro
        );

    const numeroNormalizado =
        texto(
            numeroEndereco
        );

    const complementoNormalizado =
        texto(
            complemento
        );

    const bairroNormalizado =
        texto(
            bairro
        );

    const cidadeNormalizada =
        texto(
            cidade
        );

    const ufNormalizada =
        texto(
            uf
        ).toUpperCase();

    if (
        nome.length < 2 ||
        nome.length > 160
    ) {
        throw new Error(
            "Informe o nome da empresa."
        );
    }

    if (
        razao.length < 2 ||
        razao.length > 200
    ) {
        throw new Error(
            "Informe a razão social."
        );
    }

    if (
        !cnpjOnboardingValido(
            documento
        )
    ) {
        throw new Error(
            "Informe um CNPJ válido."
        );
    }

    if (
        responsavelNormalizado.length <
        2
    ) {
        throw new Error(
            "Informe o responsável pela empresa."
        );
    }

    if (
        !emailValido(
            emailNormalizado
        )
    ) {
        throw new Error(
            "Informe um e-mail empresarial válido."
        );
    }

    if (
        !telefoneValido(
            telefone
        )
    ) {
        throw new Error(
            "Informe um telefone válido."
        );
    }

    if (
        ![
            "Contratante",
            "Terceirizada",
            "Subcontratada",
        ].includes(
            empresaTipo
        )
    ) {
        throw new Error(
            "Tipo da empresa inválido."
        );
    }

    if (
        cepNormalizado.length !==
        8
    ) {
        throw new Error(
            "Informe um CEP com 8 dígitos."
        );
    }

    if (
        logradouroNormalizado.length <
        2
    ) {
        throw new Error(
            "Informe o logradouro."
        );
    }

    if (!numeroNormalizado) {
        throw new Error(
            "Informe o número do endereço ou S/N."
        );
    }

    if (
        bairroNormalizado.length <
        2
    ) {
        throw new Error(
            "Informe o bairro."
        );
    }

    if (
        cidadeNormalizada.length <
        2
    ) {
        throw new Error(
            "Informe a cidade."
        );
    }

    if (
        !/^[A-Z]{2}$/.test(
            ufNormalizada
        )
    ) {
        throw new Error(
            "Informe uma UF válida com 2 letras."
        );
    }

    return {
        nome,
        razaoSocial:
            razao,
        cnpj:
            documento,
        responsavel:
            responsavelNormalizado,
        email:
            emailNormalizado,
        telefone:
            somenteDigitos(
                telefone
            ),
        empresaTipo,
        cep:
            cepNormalizado,
        logradouro:
            logradouroNormalizado,
        numeroEndereco:
            numeroNormalizado,
        complemento:
            complementoNormalizado,
        bairro:
            bairroNormalizado,
        cidade:
            cidadeNormalizada,
        uf:
            ufNormalizada,
    };
}

export function validarLogoOnboardingService(
    arquivo
) {
    if (!arquivo) {
        throw new Error(
            "Adicione o logo da empresa."
        );
    }

    const tipo =
        texto(
            arquivo.type
        ).toLowerCase();

    const tamanho =
        Number(
            arquivo.size || 0
        );

    if (
        !TIPOS_LOGO_PERMITIDOS.has(
            tipo
        )
    ) {
        throw new Error(
            "Logo inválido. Use PNG, JPG ou WEBP."
        );
    }

    if (
        tamanho <= 0 ||
        tamanho >
            MAX_LOGO_BYTES
    ) {
        throw new Error(
            "O logo deve possuir no máximo 5 MB."
        );
    }

    return {
        nome:
            texto(
                arquivo.name
            ),
        tipo,
        tamanho,
    };
}

export function validarAdministradorInicialOnboardingService({
    adminNome,
    adminEmail,
    adminFuncao,
} = {}) {
    const nome =
        texto(
            adminNome
        );

    const email =
        texto(
            adminEmail
        ).toLowerCase();

    const funcao =
        texto(
            adminFuncao
        ) ||
        "Responsável pelo SafeScan";

    if (
        nome.length <
        2
    ) {
        throw new Error(
            "Informe o nome do responsável pelo sistema."
        );
    }

    if (
        !emailValido(
            email
        )
    ) {
        throw new Error(
            "Informe um e-mail válido para o responsável pelo sistema."
        );
    }

    return {
        nome,
        email,
        funcao,
        papel:
            "administrador",
    };
}

function valorParaCentavos(
    valor
) {
    let normalizado =
        texto(
            valor
        );

    if (!normalizado) {
        return 0;
    }

    if (
        normalizado.includes(
            ","
        )
    ) {
        normalizado =
            normalizado
                .replace(
                    /\./g,
                    ""
                )
                .replace(
                    ",",
                    "."
                );
    }

    const numero =
        Number(
            normalizado
        );

    if (
        !Number.isFinite(
            numero
        ) ||
        numero < 0
    ) {
        throw new Error(
            "Valor monetário inválido."
        );
    }

    return Math.round(
        numero * 100
    );
}

function inteiroFaixa(
    valor,
    minimo,
    maximo,
    label
) {
    const numero =
        Number(
            valor
        );

    if (
        !Number.isInteger(
            numero
        ) ||
        numero < minimo ||
        numero > maximo
    ) {
        throw new Error(
            `${label} deve ficar entre ${minimo} e ${maximo}.`
        );
    }

    return numero;
}

export function validarConfiguracaoComercialOnboardingService({
    modeloCobranca,
    valorBase,
    valorColaborador,
    colaboradoresIncluidos,
    armazenamentoIncluidoGb,
    valorGbExcedente,
    diaFechamento,
    diaVencimento,
    inicioVigencia,
    financeiroNome,
    financeiroEmail,
    financeiroTelefone,
} = {}) {
    const modelo =
        texto(
            modeloCobranca
        );

    if (
        !MODELOS_COBRANCA.has(
            modelo
        )
    ) {
        throw new Error(
            "Selecione um modelo de cobrança válido."
        );
    }

    const valorBaseCentavos =
        valorParaCentavos(
            valorBase
        );

    const valorColaboradorCentavos =
        valorParaCentavos(
            valorColaborador
        );

    const valorGbExcedenteCentavos =
        valorParaCentavos(
            valorGbExcedente
        );

    if (
        modelo ===
            "mensalidade_fixa" &&
        valorBaseCentavos <= 0
    ) {
        throw new Error(
            "Informe o valor da mensalidade fixa."
        );
    }

    if (
        modelo ===
            "por_colaborador" &&
        valorColaboradorCentavos <= 0
    ) {
        throw new Error(
            "Informe o valor por colaborador."
        );
    }

    if (
        modelo ===
        "base_mais_colaborador"
    ) {
        if (
            valorBaseCentavos <= 0 ||
            valorColaboradorCentavos <= 0
        ) {
            throw new Error(
                "Informe o valor base e o valor por colaborador."
            );
        }
    }

    const incluidos =
        inteiroFaixa(
            colaboradoresIncluidos,
            0,
            1000000,
            "Colaboradores incluídos"
        );

    const armazenamento =
        Number(
            armazenamentoIncluidoGb
        );

    if (
        !Number.isFinite(
            armazenamento
        ) ||
        armazenamento < 0
    ) {
        throw new Error(
            "Informe uma franquia de armazenamento válida."
        );
    }

    const fechamento =
        inteiroFaixa(
            diaFechamento,
            1,
            28,
            "Dia de fechamento"
        );

    const vencimento =
        inteiroFaixa(
            diaVencimento,
            1,
            28,
            "Dia de vencimento"
        );

    const vigencia =
        texto(
            inicioVigencia
        );

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            vigencia
        )
    ) {
        throw new Error(
            "Informe a data de início da vigência comercial."
        );
    }

    const contatoNome =
        texto(
            financeiroNome
        );

    const contatoEmail =
        texto(
            financeiroEmail
        ).toLowerCase();

    if (
        contatoNome.length <
        2
    ) {
        throw new Error(
            "Informe o contato financeiro."
        );
    }

    if (
        !emailValido(
            contatoEmail
        )
    ) {
        throw new Error(
            "Informe um e-mail financeiro válido."
        );
    }

    if (
        !telefoneValido(
            financeiroTelefone
        )
    ) {
        throw new Error(
            "Informe um telefone financeiro válido."
        );
    }

    return {
        modeloCobranca:
            modelo,
        valorBaseCentavos,
        valorColaboradorCentavos,
        colaboradoresIncluidos:
            incluidos,
        armazenamentoIncluidoGb:
            armazenamento,
        valorGbExcedenteCentavos,
        diaFechamento:
            fechamento,
        diaVencimento:
            vencimento,
        inicioVigencia:
            vigencia,
        financeiroNome:
            contatoNome,
        financeiroEmail:
            contatoEmail,
        financeiroTelefone:
            somenteDigitos(
                financeiroTelefone
            ),
    };
}

export function montarOnboardingCompletoPreviewService({
    formulario,
    arquivoLogo,
} = {}) {
    const dados =
        formulario &&
        typeof formulario ===
            "object"
            ? formulario
            : {};

    const provisionamento =
        montarProvisionamentoTenantRascunhoPayload({
            nomeTenant:
                dados.nomeTenant,
            slug:
                dados.slug,
            empresaNome:
                dados.empresaNome,
            empresaTipo:
                dados.empresaTipo,
        });

    const empresa =
        validarEmpresaOnboardingService(
            dados
        );

    const branding =
        validarLogoOnboardingService(
            arquivoLogo
        );

    const administrador =
        validarAdministradorInicialOnboardingService(
            dados
        );

    const comercial =
        validarConfiguracaoComercialOnboardingService(
            dados
        );

    return {
        provisionamento,
        empresa,
        branding,
        administrador,
        comercial,
    };
}