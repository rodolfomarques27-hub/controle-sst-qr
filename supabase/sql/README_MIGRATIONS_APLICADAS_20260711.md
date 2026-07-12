# Migrations aplicadas no Supabase

Projeto: `koukyzczwttemgmloagt`

As migrations abaixo foram aplicadas no banco remoto em 11/07/2026. Os SQLs historicos desta pasta continuam preservados; este arquivo funciona como registro de release para evitar divergencia entre o banco e o repositorio.

- `restringir_execucao_rpcs_administrativas`
- `restringir_execucao_anon_rpcs_administrativas`
- `restringir_listagem_publica_logos_empresas`
- `fixar_search_path_funcoes_publicas`
- `restringir_tabelas_usuarios_ativos`
- `remover_execucao_anon_usuario_ativo`
- `restringir_operacoes_tabelas_usuarios_ativos`
- `restringir_rpcs_internas_anonimo`
- `fechar_grants_publicos_rpcs_internas`
- `otimizar_indices_e_politicas_acesso`
- `remover_indices_duplicados_solicitacao`
- `remover_execucao_anon_email_sessao`
- `sincronizar_permissoes_tecnico_sst`
- `preparar_vinculo_empresa_usuarios`
- `adicionar_empresa_rpc_permissoes`
- `ativar_isolamento_empresa_progressivo`
- `exigir_empresa_usuarios_operacionais`
- `vincular_tecnico_sst_idealiza_cidades`
- `validar_regra_empresa_usuarios_operacionais`

## Estado atual

- RLS sem politicas permissivas nas tabelas revisadas.
- RPCs administrativas bloqueadas para `anon`.
- Listagem anonima do bucket de logos removida.
- Vinculo empresarial preparado em `usuarios_permissoes_sistema.empresa_id`.
- Isolamento empresarial ativado de forma progressiva: usuarios sem vinculo mantem o fluxo atual; usuarios vinculados ficam limitados a sua empresa.
- Novos usuarios operacionais ativos exigem `empresa_id`; registros legados continuam preservados para correção assistida.

## Validacao concluida

- A restricao de empresa foi validada depois do vinculo do tecnico SST.
- O usuario `rodolfomarques` esta vinculado a `IDEALIZA CIDADES`.
- Nao ha pendencias de vinculo empresarial para usuarios operacionais ativos.

## Pendencia manual de seguranca

- Ativar a protecao contra senhas vazadas no Supabase Auth em `https://supabase.com/dashboard/project/koukyzczwttemgmloagt/auth/protection`.
- Referencia: `https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection`.

## Proxima sincronizacao

O proximo passo de governanca e consolidar estes comandos em uma pasta padrao `supabase/migrations`, preservando a ordem original e executando a validacao em um ambiente de homologacao antes de qualquer nova implantacao.
