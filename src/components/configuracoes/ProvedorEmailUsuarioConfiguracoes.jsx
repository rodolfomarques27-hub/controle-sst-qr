import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Mail, RefreshCw, Save, ShieldCheck, ShieldOff } from "lucide-react";
import {
    obterEmailUsuario, salvarEmailUsuario,
    testarEmailUsuario, desativarEmailUsuario,
} from "../../services/emailUsuarioConfiguracaoService.js";

const BASE = {
    provedor: "GMAIL_SMTP",
    host: "smtp.gmail.com",
    porta: "465",
    modoSeguranca: "TLS_IMPLICITO",
    usuarioSmtp: "",
    remetenteEmail: "",
    remetenteNomePadrao: "",
    responderParaPadrao: "",
};

const INPUT = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 disabled:bg-slate-100";
const BOTAO = "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold disabled:opacity-50";

function formularioDe(c, emailUsuario = "", nomeUsuario = "") {
    if (!c) {
        const email = String(emailUsuario || "").trim();
        const posicaoArroba = email.indexOf("@");
        const dominio = posicaoArroba >= 0 ? email.slice(posicaoArroba + 1) : "";
        const posicaoPonto = dominio.lastIndexOf(".");
        const emailValido =
            posicaoArroba > 0 &&
            posicaoArroba === email.lastIndexOf("@") &&
            posicaoPonto > 0 &&
            posicaoPonto < dominio.length - 1 &&
            !/\s/.test(email);
        const nome = String(nomeUsuario || "").trim();

        return {
            ...BASE,
            usuarioSmtp: emailValido ? email : "",
            remetenteEmail: emailValido ? email : "",
            remetenteNomePadrao:
                nome && nome !== "Usuário do cliente" ? nome : "",
        };
    }
    return {
        provedor: c.provedor || BASE.provedor,
        host: c.host || BASE.host,
        porta: String(c.porta || BASE.porta),
        modoSeguranca: c.modoSeguranca || BASE.modoSeguranca,
        usuarioSmtp: c.usuarioSmtp || "",
        remetenteEmail: c.remetenteEmail || "",
        remetenteNomePadrao: c.remetenteNomePadrao || "",
        responderParaPadrao: c.responderParaPadrao || "",
    };
}

function Campo({ id, label, value, onChange, disabled, type = "text", required = false }) {
    return (
        <label className="block min-w-0 text-xs font-bold text-slate-600">
            {label}
            <input
                id={id} name={id} type={type} value={value}
                onChange={(e) => onChange(id, e.target.value)}
                disabled={disabled} required={required}
                autoComplete="off" className={INPUT}
            />
        </label>
    );
}

export function ProvedorEmailUsuarioConfiguracoes({ tenantId, supabaseClient, emailUsuario, nomeUsuario }) {
    const [config, setConfig] = useState(null);
    const [form, setForm] = useState(() => formularioDe(null, emailUsuario, nomeUsuario));
    const [loading, setLoading] = useState(true);
    const [consultado, setConsultado] = useState(false);
    const [busy, setBusy] = useState("");
    const [revisao, setRevisao] = useState(0);
    const [aviso, setAviso] = useState(null);
    const [novaSenha, setNovaSenha] = useState(false);
    const [confirmar, setConfirmar] = useState(false);
    const senhaRef = useRef(null);

    const limparSenha = () => {
        if (senhaRef.current) senhaRef.current.value = "";
        setNovaSenha(false);
    };

    useEffect(() => {
        let valido = true;
        void Promise.resolve().then(async () => {
            if (!valido) return;

            setLoading(true);
            setConsultado(false);
            setConfig(null);
            setForm(formularioDe(null, emailUsuario, nomeUsuario));
            setAviso(null);
            setConfirmar(false);

            if (senhaRef.current) senhaRef.current.value = "";
            setNovaSenha(false);

            try {
                const atual = await obterEmailUsuario(supabaseClient, tenantId);
                if (!valido) return;
                setConfig(atual);
                setForm(formularioDe(atual, emailUsuario, nomeUsuario));
                setConsultado(true);
            } catch {
                if (valido) setAviso({
                    erro: true,
                    texto: "Não foi possível consultar o SMTP pessoal. Verifique sua sessão e permissão.",
                });
            } finally {
                if (valido) setLoading(false);
            }
        });
        return () => { valido = false; };
    }, [tenantId, supabaseClient, revisao, emailUsuario, nomeUsuario]);

    const alterar = (campo, valor) => {
        setConfirmar(false);
        setForm((anterior) => ({ ...anterior, [campo]: valor }));
    };

    const trocarProvedor = (provedor) => {
        const padrao = provedor === "GMAIL_SMTP"
            ? { host: "smtp.gmail.com", porta: "465", modoSeguranca: "TLS_IMPLICITO" }
            : provedor === "MICROSOFT_365_SMTP"
                ? { host: "smtp.office365.com", porta: "587", modoSeguranca: "STARTTLS" }
                : {};
        setForm((anterior) => ({ ...anterior, ...padrao, provedor }));
    };

    const alterado = consultado && JSON.stringify(form) !== JSON.stringify(formularioDe(config, emailUsuario, nomeUsuario));
    const bloqueado = loading || Boolean(busy) || !consultado;
    const edicaoBloqueada = loading || Boolean(busy);
    const temSenha = config?.credencialConfigurada === true;
    const podeTestar = temSenha && config?.ativo === true && !bloqueado && !alterado && !novaSenha;
    const custom = form.provedor === "SMTP_PERSONALIZADO";

    async function salvar(e) {
        e.preventDefault();
        if (bloqueado) return;
        const senha = senhaRef.current?.value || "";
        if ((!temSenha && !senha) || senha.length > 500) {
            setAviso({ erro: true, texto: "Informe uma credencial SMTP válida (até 500 caracteres)." });
            return;
        }
        setBusy("salvar");
        setAviso(null);
        try {
            const salvo = await salvarEmailUsuario(
                supabaseClient, tenantId, form, senha, config?.versao ?? null
            );
            setConfig(salvo);
            setForm(formularioDe(salvo));
            setAviso({ erro: false, texto: "Configuração salva. Execute o teste SMTP para validar." });
        } catch {
            setAviso({ erro: true, texto: "Falha ao salvar. Confira os dados ou atualize a versão." });
        } finally {
            limparSenha();
            setBusy("");
        }
    }

    async function testar() {
        if (!podeTestar) return;
        setBusy("testar");
        setAviso(null);
        try {
            const resultado = await testarEmailUsuario(supabaseClient, tenantId);
            setConfig(resultado.configuracao);
            setForm(formularioDe(resultado.configuracao));
            setAviso(resultado.teste?.status === "APROVADO"
                ? { erro: false, texto: "Conexão aprovada. Nenhum e-mail foi enviado neste teste." }
                : { erro: true, texto: "Teste reprovado: " + (resultado.teste?.codigo || "SMTP_TESTE_FALHOU") });
        } catch {
            setAviso({ erro: true, texto: "Não foi possível testar a conexão SMTP." });
        } finally {
            setBusy("");
        }
    }

    async function desativar() {
        if (bloqueado || !confirmar || !config?.versao || alterado || novaSenha) return;
        setBusy("desativar");
        setAviso(null);
        try {
            const atual = await desativarEmailUsuario(supabaseClient, tenantId, config.versao);
            setConfig(atual);
            setForm(formularioDe(atual));
            setAviso({ erro: false, texto: "SMTP pessoal desativado." });
        } catch {
            setAviso({ erro: true, texto: "Não foi possível desativar. Atualize e tente novamente." });
        } finally {
            setConfirmar(false);
            limparSenha();
            setBusy("");
        }
    }

    function atualizar() {
        limparSenha();
        setAviso(null);
        setConfig(null);
        setForm(formularioDe(null, emailUsuario, nomeUsuario));
        setLoading(true);
        setConfirmar(false);
        setRevisao((n) => n + 1);
    }

    return (
        <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="flex items-center gap-2 text-base font-black text-slate-900">
                        <Mail className="h-5 w-5 text-emerald-700" /> Minha conta SMTP
                    </h3>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
                        Configuração individual para envio manual autenticado de Auditoria.
                        Não altera o SMTP central nem o provedor do tenant.
                    </p>
                </div>
                <button type="button" disabled={loading || Boolean(busy)} onClick={atualizar}
                    className={BOTAO + " border-slate-200 bg-white text-slate-700"}>
                    <RefreshCw className="h-4 w-4" /> Atualizar
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    ["Estado", !consultado ? "Consulta indisponível" : !temSenha ? "Não configurado" : config?.ativo ? "Ativo" : "Inativo"],
                    ["Credencial", !consultado ? "Não verificada" : temSenha ? "Protegida no Vault" : "Não configurada"],
                    ["Último teste", !consultado ? "Consulta indisponível" : config?.ultimoTesteStatus || "Não testado"],
                ].map(([titulo, valor]) => (
                    <div key={titulo} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                        <p className="text-xs text-slate-500">{titulo}</p>
                        <p className="mt-2 text-sm font-black text-slate-900">{valor}</p>
                    </div>
                ))}
            </div>

            {aviso && (
                <div role="status" className={
                    "flex gap-2 rounded-xl border p-3 text-xs font-bold " +
                    (aviso.erro ? "border-rose-200 bg-rose-50 text-rose-800"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800")
                }>
                    {aviso.erro ? <CircleAlert className="h-4 w-4 shrink-0" />
                        : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    {aviso.texto}
                </div>
            )}

            <form onSubmit={salvar} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-xs font-bold text-slate-600">
                        Provedor
                        <select name="provedor" value={form.provedor} disabled={edicaoBloqueada}
                            onChange={(e) => trocarProvedor(e.target.value)} className={INPUT}>
                            <option value="GMAIL_SMTP">Gmail SMTP</option>
                            <option value="MICROSOFT_365_SMTP">Microsoft 365 SMTP</option>
                            <option value="SMTP_PERSONALIZADO">SMTP personalizado</option>
                        </select>
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                        Segurança
                        <select name="modoSeguranca" value={form.modoSeguranca}
                            disabled={edicaoBloqueada || form.provedor === "MICROSOFT_365_SMTP"}
                            onChange={(e) => {
                                const modo = e.target.value;
                                setForm((anterior) => ({
                                    ...anterior, modoSeguranca: modo,
                                    ...(anterior.provedor === "GMAIL_SMTP"
                                        ? { porta: modo === "TLS_IMPLICITO" ? "465" : "587" } : {}),
                                }));
                            }} className={INPUT}>
                            <option value="TLS_IMPLICITO">TLS implícito</option>
                            <option value="STARTTLS">STARTTLS</option>
                        </select>
                    </label>
                    <Campo id="host" label="Servidor SMTP" value={form.host}
                        onChange={alterar} disabled={edicaoBloqueada || !custom} required />
                    <Campo id="porta" label="Porta" type="number" value={form.porta}
                        onChange={alterar} disabled={edicaoBloqueada || !custom} required />
                    <Campo id="usuarioSmtp" label="Usuário SMTP" value={form.usuarioSmtp}
                        onChange={alterar} disabled={edicaoBloqueada} required />
                    <Campo id="remetenteEmail" label="E-mail remetente" type="email"
                        value={form.remetenteEmail} onChange={alterar} disabled={edicaoBloqueada} required />
                    <Campo id="remetenteNomePadrao" label="Nome do remetente"
                        value={form.remetenteNomePadrao} onChange={alterar} disabled={edicaoBloqueada} required />
                    <Campo id="responderParaPadrao" label="Responder para (opcional)" type="email"
                        value={form.responderParaPadrao} onChange={alterar} disabled={edicaoBloqueada} />

                    <label className="text-xs font-bold text-slate-600 md:col-span-2">
                        {temSenha ? "Nova senha (deixe vazio para manter)" : "Senha de aplicativo / SMTP"}
                        <input ref={senhaRef} name="credencialNova" type="password"
                            autoComplete="off" maxLength={500} disabled={edicaoBloqueada}
                            onChange={(e) => setNovaSenha(Boolean(e.target.value))}
                            className={INPUT} />
                        <span className="mt-1 block text-[11px] font-normal text-slate-500">
                            Credencial de escrita única. A senha atual nunca é exibida.
                        </span>
                    </label>
                </div>

                {!consultado && !loading && (
                    <p className="text-xs font-medium text-slate-600">
                        Você pode editar os campos para preparar um rascunho.
                        Sem uma conta ativa e autorizada neste tenant, não será
                        possível salvar nem testar a conexão. O rascunho não é armazenado.
                    </p>
                )}
                {consultado && (alterado || novaSenha) && (
                    <p className="text-xs font-bold text-amber-700">
                        Existem alterações não salvas. Salve antes de testar.
                    </p>
                )}

                <div className="flex flex-wrap gap-2">
                    <button type="submit" disabled={bloqueado}
                        className={BOTAO + " border-emerald-700 bg-emerald-700 text-white"}>
                        <Save className="h-4 w-4" /> Salvar configuração
                    </button>
                    <button type="button" onClick={testar} disabled={!podeTestar}
                        className={BOTAO + " border-emerald-200 bg-emerald-50 text-emerald-800"}>
                        <ShieldCheck className="h-4 w-4" /> Testar conexão
                    </button>
                    {config?.ativo && (
                        <button type="button" disabled={bloqueado || alterado || novaSenha}
                            onClick={() => confirmar ? void desativar() : setConfirmar(true)}
                            className={BOTAO + " border-rose-200 bg-rose-50 text-rose-800"}>
                            <ShieldOff className="h-4 w-4" />
                            {confirmar ? "Confirmar desativação" : "Desativar"}
                        </button>
                    )}
                    {confirmar && (
                        <button type="button" onClick={() => setConfirmar(false)}
                            className={BOTAO + " border-slate-200"}>
                            Cancelar
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
