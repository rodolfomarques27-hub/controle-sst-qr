import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const raiz = process.cwd();

function ler(relativo) {
    return fs.readFileSync(
        path.join(
            raiz,
            ...relativo.split("/")
        ),
        "utf8"
    );
}

function contar(texto, trecho) {
    return texto.split(trecho).length - 1;
}

function exigir(condicao, mensagem) {
    if (!condicao) {
        throw new Error(
            "SMOKE FAIL: " + mensagem
        );
    }
}

const dashboard =
    ler("src/components/dashboard/Dashboard.jsx");

const auditoria =
    ler("src/components/auditoria/EditorNotificacaoHistoricoAuditoria.jsx");

const treinamentos =
    ler("src/components/treinamentos/TreinamentosPage.jsx");

const rapidApi =
    ler("supabase/functions/rapid-api/index.ts");

const resolver =
    ler("supabase/functions/_shared/emailProvedorResolver.ts");

exigir(
    contar(
        dashboard,
        "tenantId: tenantIdRuntime"
    ) === 3,
    "Dashboard deve enviar tenantId exatamente nos 3 fluxos SST."
);

exigir(
    dashboard.includes(
        "useTenantRuntimeContext"
    ),
    "Dashboard deve manter TenantRuntimeContext."
);

exigir(
    contar(
        auditoria,
        "tenantId: tenantIdRuntime"
    ) === 1,
    "Auditoria deve enviar tenantId exatamente uma vez."
);

exigir(
    auditoria.includes(
        'useTenantRuntimeContext'
    ),
    "Auditoria deve obter tenant do runtime."
);

exigir(
    contar(
        treinamentos,
        "tenantId: tenantIdRuntime"
    ) === 1,
    "Treinamentos deve enviar tenantId exatamente uma vez."
);

exigir(
    treinamentos.includes(
        'useTenantRuntimeContext'
    ),
    "Treinamentos deve obter tenant do runtime."
);

exigir(
    rapidApi.includes(
        "dadosRecebidos.tenantId"
    ),
    "rapid-api deve exigir tenantId no payload."
);

exigir(
    rapidApi.includes(
        'Deno.env.get("SUPABASE_ANON_KEY")'
    ),
    "rapid-api deve criar contexto autenticado."
);

exigir(
    rapidApi.includes(
        'req.headers.get('
    ) &&
    rapidApi.includes(
        '"Authorization"'
    ),
    "rapid-api deve ler Authorization."
);

exigir(
    rapidApi.includes(
        ".auth"
    ) &&
    rapidApi.includes(
        ".getUser()"
    ),
    "rapid-api deve validar o usuário autenticado."
);

exigir(
    rapidApi.includes(
        '"usuario_tem_acesso_tenant"'
    ),
    "rapid-api deve validar acesso ao tenant no backend."
);

exigir(
    rapidApi.includes(
        "p_tenant_id:"
    ) &&
    rapidApi.includes(
        "tenantId"
    ),
    "rapid-api deve validar exatamente o tenant recebido."
);

exigir(
    rapidApi.includes(
        'canal:'
    ) &&
    rapidApi.includes(
        '"TENANT"'
    ),
    "rapid-api deve resolver o provedor pelo canal TENANT."
);

exigir(
    !rapidApi.includes(
        'canal: "PLATAFORMA"'
    ),
    "rapid-api não pode forçar canal PLATAFORMA."
);

exigir(
    contar(
        rapidApi,
        ".sendMail("
    ) === 1,
    "envio SMTP existente deve permanecer único."
);

exigir(
    resolver.includes(
        "TENANT"
    ),
    "resolver compartilhado deve suportar canal TENANT."
);

exigir(
    resolver.includes(
        "backend_obter_configuracao_email_tenant_para_envio"
    ),
    "resolver compartilhado deve consultar configuração de envio do tenant."
);

console.log("R2.2-E1 EMAIL SST TENANT SMOKE = GREEN");
console.log("DASHBOARD_TENANT_CALLS=3");
console.log("AUDITORIA_TENANT_CALLS=1");
console.log("TREINAMENTOS_TENANT_CALLS=1");
console.log("EDGE_AUTH_VALIDATION=SIM");
console.log("EDGE_TENANT_ACCESS_VALIDATION=SIM");
console.log("RESOLVER_CANAL_TENANT=SIM");
console.log("FALLBACK_PLATAFORMA_EXPLICITO=NAO");
console.log("SMTP_REAL_EXECUTADO=NAO");
console.log("EMAIL_ENVIADO=NAO");
