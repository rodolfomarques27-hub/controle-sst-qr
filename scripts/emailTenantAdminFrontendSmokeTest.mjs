import {
    readFileSync,
} from "node:fs";

const arquivos = {
    page:
        "src/features/tenant-admin/pages/TenantAdminTenantDetailPage.jsx",

    panel:
        "src/features/tenant-admin/components/TenantAdminEmailProviderPanel.jsx",

    service:
        "src/features/tenant-admin/services/tenantAdminEmailProviderService.js",
};

function ler(
    caminho,
) {
    return readFileSync(
        caminho,
        "utf8",
    );
}

function exigir(
    condicao,
    mensagem,
) {
    if (!condicao) {
        throw new Error(
            mensagem,
        );
    }
}

const page =
    ler(
        arquivos.page,
    );

const panel =
    ler(
        arquivos.panel,
    );

const service =
    ler(
        arquivos.service,
    );

exigir(
    page.includes(
        "TenantAdminEmailProviderPanel",
    ),
    "Painel de e-mail não integrado ao detalhe do tenant.",
);

exigir(
    page.includes(
        'setAbaAtiva(\n                                "email"',
    ) ||
    page.includes(
        'setAbaAtiva(\r\n                                "email"',
    ),
    "Aba E-mail não encontrada.",
);

exigir(
    page.includes(
        'abaAtiva ===\n                            "email"',
    ) ||
    page.includes(
        'abaAtiva ===\r\n                            "email"',
    ),
    "Renderização da aba E-mail não encontrada.",
);

exigir(
    service.includes(
        '"admin-gerenciar-provedor-email-tenant"',
    ),
    "Service não utiliza a Edge tenant aprovada.",
);

for (
    const acao of
    [
        '"obter"',
        '"salvar"',
        '"testar"',
        '"definir_modo"',
    ]
) {
    exigir(
        service.includes(
            acao,
        ),
        `Ação obrigatória ausente no service: ${acao}`,
    );
}

exigir(
    !service.includes(
        ".rpc(",
    ),
    "Frontend técnico não pode chamar RPC backend diretamente.",
);

exigir(
    !service.includes(
        "service_role",
    ),
    "Frontend não pode conter service_role.",
);

exigir(
    !service.toLowerCase().includes(
        "vault_id",
    ),
    "Frontend não pode conhecer identificador do Vault.",
);

exigir(
    !panel.toLowerCase().includes(
        "vault_id",
    ),
    "Painel não pode conhecer identificador do Vault.",
);

exigir(
    !panel.includes(
        "sendMail",
    ),
    "Painel não pode enviar e-mail diretamente.",
);

exigir(
    !service.includes(
        "sendMail",
    ),
    "Service frontend não pode enviar e-mail diretamente.",
);

exigir(
    panel.includes(
        'type="password"',
    ),
    "Credencial precisa ser write-only em campo password.",
);

exigir(
    panel.includes(
        "credencialConfigurada",
    ),
    "Painel deve trabalhar somente com indicador de credencial configurada.",
);

exigir(
    /ultimoTesteStatus\s*===\s*"APROVADO"/.test(
        panel,
    ),
    "Ativação do provedor próprio precisa depender de teste aprovado.",
);

exigir(
    panel.includes(
        "formularioAlterado",
    ),
    "Alterações não salvas precisam bloquear teste/ativação.",
);

exigir(
    panel.includes(
        "O teste valida a conexão SMTP. Nenhuma mensagem é enviada.",
    ),
    "Aviso de verify sem envio não encontrado.",
);

exigir(
    panel.includes(
        "SafeScan gerenciado",
    ) &&
    panel.includes(
        "Provedor próprio",
    ) &&
    panel.includes(
        "Desativado",
    ),
    "Os três modos operacionais precisam estar representados.",
);

console.log("");
console.log(
    "R2_2_D2B_EMAIL_TENANT_ADMIN_FRONTEND_SMOKE_OK",
);
console.log(
    "TENANT_ADMIN_EMAIL_TAB=SIM",
);
console.log(
    "EDGE_TENANT_ONLY=SIM",
);
console.log(
    "ACOES_OBTER_SALVAR_TESTAR_DEFINIR_MODO=SIM",
);
console.log(
    "SECRET_FRONTEND=NAO",
);
console.log(
    "VAULT_ID_FRONTEND=NAO",
);
console.log(
    "SERVICE_ROLE_FRONTEND=NAO",
);
console.log(
    "RPC_BACKEND_DIRETO_FRONTEND=NAO",
);
console.log(
    "CREDENCIAL_WRITE_ONLY=SIM",
);
console.log(
    "PROVEDOR_CLIENTE_TESTE_APROVADO=OBRIGATORIO",
);
console.log(
    "SMTP_SENDMAIL_FRONTEND=0",
);
console.log(
    "SMTP_REAL_DURANTE_SMOKE=NAO",
);