import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const atual =
    fileURLToPath(
        import.meta.url
    );

const repo =
    path.resolve(
        path.dirname(atual),
        ".."
    );

const edge =
    path.join(
        repo,
        "supabase",
        "functions",
        "enviar-email-acesso-usuario",
        "index.ts"
    );

const codigo =
    fs.readFileSync(
        edge,
        "utf8"
    );

const obrigatorios = [
    '"../_shared/emailProvedorResolver.ts"',
    "ErroResolvedorEmail",
    "resolverTransportadorEmailParaEnvio",
    "TransportadorEmailResolvido",
    '"acesso_usuario_criado"',
    '"ACESSO_CRIADO"',
    '"acesso_usuario_email_envios"',
    '"usuario_permissao_sistema_atual"',
    '"usuarios_permissoes_sistema"',
    '"perfis_permissoes_sistema"',
    "permissoes_json",
    "precisa_trocar_senha",
    '"obter_modelo_email_sst_para_envio"',
    '"modelos/acesso_usuario_criado/assinatura"',
    "montarSnapshotAutoritativo",
    "normalizarSnapshotRecebido",
    "snapshotsIguais",
    "podeExecutarAcao",
    "podeGerenciarAcessos",
    "LEGADOS",
    "PADRAO_PERFIL",
    "criarPayloadHistoricoSeguro",
    "permissoes_snapshot:",
    "snapshotAutoritativo",
    "chave_idempotencia",
    "provedor_mensagem_id",
    "erro_codigo",
    '"PREPARANDO"',
    '"ENVIANDO"',
    '"ENVIADO"',
    '"ERRO"',
    ".sendMail({",
    "senha_temporaria:",
    "senhaTemporaria",
    "modulos.acessos_app",
    "modulos.configuracoes",
    "configuracoes",
    "gerenciar_permissoes",
    "usuario_email",
];

for (const marcador of obrigatorios) {
    assert.ok(
        codigo.includes(marcador),
        `Marcador obrigatório ausente: ${marcador}`
    );
}

const proibidos = [
    "rapid-api",
    "admin-criar-login-app",
    "auth.admin.createUser",
    "auth.admin.updateUserById",
    "auth.admin.deleteUser",
    "console.log",
    "console.info",
    "console.warn",
    "console.error",
    "provedores_mensagem_id",
    "mensagem_erro",
    "JSON.stringify(corpo)",
    "JSON.stringify(req",
    "erro: erro.message",
    "erro: erro?.message",
    '"npm:nodemailer@6.9.16"',
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
    "smtp.gmail.com",
    "async function criarTransportador(",
];

for (const marcador of proibidos) {
    assert.equal(
        codigo.includes(marcador),
        false,
        `Conteúdo proibido localizado: ${marcador}`
    );
}

assert.match(
    codigo,
    /variaveisAssunto\.has\(\s*"senha_temporaria"/,
    "Senha temporária deve ser proibida no assunto."
);

assert.match(
    codigo,
    /senhaTemporaria\.length < 6/,
    "Validação mínima da credencial ausente."
);

assert.match(
    codigo,
    /senhaTemporaria\.length > 200/,
    "Limite máximo da credencial ausente."
);

assert.match(
    codigo,
    /usuario\.precisa_trocar_senha/,
    "Fluxo precisa validar primeiro acesso ainda pendente."
);

assert.match(
    codigo,
    /!booleano\(\s*usuario\.precisa_trocar_senha/,
    "Comunicação inicial deve bloquear credencial já consumida."
);

assert.match(
    codigo,
    /snapshotsIguais\(\s*snapshotRecebido,\s*snapshotAutoritativo/,
    "Snapshot recebido precisa ser confrontado com o banco."
);

assert.match(
    codigo,
    /permissoes_snapshot:\s*snapshot/,
    "Histórico deve persistir apenas snapshot autorizado."
);

assert.match(
    codigo,
    /to:\s*usuarioEmail/,
    "Destinatário SMTP precisa vir do usuário salvo."
);

assert.equal(
    codigo.includes(
        "to: corpo."
    ),
    false,
    "Destinatário não pode ser usado diretamente do payload."
);

assert.match(
    codigo,
    /existente\.usuario_email[\s\S]*usuarioEmail/,
    "Idempotência precisa conferir o usuário da comunicação."
);

assert.match(
    codigo,
    /acessosApp[\s\S]*gerenciar_permissoes/,
    "Autorização de Acessos do App ausente."
);

assert.match(
    codigo,
    /configuracoes[\s\S]*gerenciar_permissoes/,
    "Autorização via Configurações ausente."
);

assert.match(
    codigo,
    /resolverTransportadorEmailParaEnvio\(\s*adminClient,/,
    "Fluxo não consulta o resolvedor central."
);

assert.match(
    codigo,
    /nomeRemetenteFallback:\s*remetenteNome/,
    "Fallback não preserva o nome do remetente do modelo."
);

assert.match(
    codigo,
    /provedorEmail\.remetenteEmail/,
    "From não utiliza o remetente resolvido centralmente."
);

assert.match(
    codigo,
    /provedorEmail[\s\S]*responderParaPadrao/,
    "Reply-To central não foi integrado."
);

assert.match(
    codigo,
    /classificarErroResolvedor/,
    "Erros do resolvedor não possuem classificação controlada."
);

const referenciasGmailDireto =
    (
        codigo.match(
            /GMAIL_USER|GMAIL_APP_PASSWORD|smtp\.gmail\.com/g
        ) || []
    ).length;

assert.equal(
    referenciasGmailDireto,
    0,
    "Edge de acesso ainda referencia Gmail diretamente."
);

const createTransportDireto =
    (
        codigo.match(
            /\bcreateTransport\s*\(/g
        ) || []
    ).length;

assert.equal(
    createTransportDireto,
    0,
    "Edge de acesso ainda cria transporte SMTP diretamente."
);

const sendMailDireto =
    (
        codigo.match(
            /\.sendMail\s*\(/g
        ) || []
    ).length;

assert.equal(
    sendMailDireto,
    1,
    "Edge deve manter exatamente um sendMail."
);

const resolverCalls =
    (
        codigo.match(
            /resolverTransportadorEmailParaEnvio/g
        ) || []
    ).length;

assert.equal(
    resolverCalls,
    2,
    "Esperado import + chamada do resolvedor central."
);

const inicioHistorico =
    codigo.indexOf(
        "function criarPayloadHistoricoSeguro("
    );

const fimHistorico =
    codigo.indexOf(
        "\nasync function marcarErro(",
        inicioHistorico
    );

assert.ok(
    inicioHistorico >= 0 &&
    fimHistorico > inicioHistorico,
    "Não foi possível delimitar payload do histórico."
);

const historico =
    codigo.slice(
        inicioHistorico,
        fimHistorico
    ).toLowerCase();

const proibidosHistorico = [
    "senhatemporaria",
    "senha_temporaria",
    "password",
    "passcode",
    "credential",
    "credencial",
    "secret",
    "segredo",
    "assuntofinal",
    "assunto_final",
    "corpofinal",
    "corpo_final",
    "textofinal",
    "texto_final",
    "htmlfinal",
    "html_final",
    "mensagem_erro",
];

for (const termo of proibidosHistorico) {
    assert.equal(
        historico.includes(termo),
        false,
        `Payload de histórico contém termo proibido: ${termo}`
    );
}

const consoles =
    (
        codigo.match(
            /console\./g
        ) || []
    ).length;

assert.equal(
    consoles,
    0,
    "Não pode haver console.* na Edge Function."
);

const referenciasSenha =
    (
        codigo.match(
            /senhaTemporaria/g
        ) || []
    ).length;

assert.ok(
    referenciasSenha >= 4,
    "Fluxo transitório da credencial não localizado."
);

assert.ok(
    referenciasSenha <= 8,
    `Quantidade inesperada de referências à credencial: ${referenciasSenha}`
);

const persistenciasSenha =
    (
        historico.match(
            /senha/g
        ) || []
    ).length;

assert.equal(
    persistenciasSenha,
    0,
    "Senha não pode aparecer no payload persistente."
);

process.stdout.write(
    [
        "ACESSO_EMAIL_G5M1R3_SMOKE_OK",
        "ACESSO_EMAIL_E4M1_CENTRAL_PROVIDER_SMOKE_OK",
        `REFERENCIAS_SENHA_TRANSITORIA=${referenciasSenha}`,
        `PERSISTENCIAS_SENHA_HISTORICO=${persistenciasSenha}`,
        `CONSOLE_REFERENCIAS=${consoles}`,
        `GMAIL_DIRETO_REFERENCIAS=${referenciasGmailDireto}`,
        `CREATE_TRANSPORT_DIRETO=${createTransportDireto}`,
        `SENDMAIL_REFERENCIAS=${sendMailDireto}`,
        `RESOLVER_REFERENCIAS=${resolverCalls}`,
        "SNAPSHOT_AUTORITATIVO=SIM",
        "PRIMEIRO_ACESSO_OBRIGATORIO=SIM",
        "IDEMPOTENCIA_CONFERE_USUARIO=SIM",
        "AUTORIZACAO_ALINHADA_ADMIN_LOGIN=SIM",
        "PROVEDOR_CENTRAL=SIM",
        "FALLBACK_LEGADO_VIA_SHARED=SIM",
        "DENO_WORKSPACE_TEMP=SIM",
    ].join("\n") + "\n"
);
