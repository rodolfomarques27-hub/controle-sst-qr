import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    obterEmailUsuario, salvarEmailUsuario,
    testarEmailUsuario, desativarEmailUsuario,
} from "../src/services/emailUsuarioConfiguracaoService.js";

const tenant = "11111111-1111-4111-8111-111111111111";
const chamadas = [];
const configuracao = {
    ativo: true, provedor: "GMAIL_SMTP", host: "smtp.gmail.com",
    porta: 465, modoSeguranca: "TLS_IMPLICITO",
    usuarioSmtp: "teste@example.com", remetenteEmail: "teste@example.com",
    remetenteNomePadrao: "Teste", responderParaPadrao: "",
    credencialConfigurada: true, ultimoTesteStatus: "NAO_TESTADO", versao: 3,
};
const cliente = {
    functions: {
        async invoke(nome, opcoes) {
            assert.equal(nome, "gerenciar-provedor-email-usuario");
            chamadas.push(opcoes.body);
            return {
                data: {
                    ok: true, tenantId: tenant, configuracao,
                    teste: { status: "APROVADO", codigo: null },
                },
                error: null,
            };
        },
    },
};

assert.equal((await obterEmailUsuario(cliente, tenant)).versao, 3);
await salvarEmailUsuario(cliente, tenant, { ...configuracao, porta: "465" }, "SENHA_FICTICIA", 3);
assert.equal((await testarEmailUsuario(cliente, tenant)).teste.status, "APROVADO");
await desativarEmailUsuario(cliente, tenant, 3);

assert.deepEqual(chamadas.map((c) => c.acao), ["obter", "salvar", "testar", "desativar"]);
for (const corpo of chamadas) {
    assert.equal(corpo.tenantId, tenant);
    for (const proibido of ["userId", "user_id", "executorId", "executor_id", "actorUserId"]) {
        assert.equal(Object.hasOwn(corpo, proibido), false);
    }
}
assert.equal(chamadas[1].versaoEsperada, 3);
assert.equal(chamadas[3].versaoEsperada, 3);
assert.equal(Object.hasOwn(chamadas[2], "credencialNova"), false);

await assert.rejects(obterEmailUsuario(cliente, "tenant-invalido"), /Tenant inválido/);

const painel = readFileSync("src/components/configuracoes/ProvedorEmailUsuarioConfiguracoes.jsx", "utf8");
const tenantFonte = readFileSync("src/components/configuracoes/ConfiguracoesTenant.jsx", "utf8");
const service = readFileSync("src/services/emailUsuarioConfiguracaoService.js", "utf8");

assert.match(painel, /type="password"/);
assert.match(painel, /senhaRef\.current\.value = ""/);
assert.match(painel, /!novaSenha/);
assert.doesNotMatch(
    tenantFonte,
    /Meu provedor de e-mail/
);

assert.doesNotMatch(
    tenantFonte,
    /ProvedorEmailUsuarioConfiguracoes/
);
assert.doesNotMatch(service, /\b(userId|user_id|executorId|executor_id|actorUserId|serviceRole)\b/);
assert.doesNotMatch(service + painel, /\b(localStorage|sessionStorage|console\.log|console\.error)\b/);

console.log("EMAIL_USUARIO_FRONTEND_SMOKE=GREEN");
console.log("ACOES=4");
console.log("IDENTIDADE_ENVIADA=NO");
console.log("REDE_REAL=NO");
console.log("EMAIL_REAL_ENVIADO=NO");
