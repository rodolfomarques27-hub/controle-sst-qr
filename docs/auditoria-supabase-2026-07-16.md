# Auditoria do Supabase - 16/07/2026

## Escopo

Leitura do projeto Supabase conectado e dos roteiros SQL locais. Nenhuma tabela, politica, funcao ou dado de producao foi alterado nesta auditoria.

## Resultado atual

- 25 tabelas no schema `public`.
- 25 tabelas com Row Level Security (RLS) habilitado.
- As tabelas `mapas_obras`, `mapas_pontos` e `mapas_itens` possuem quatro politicas cada.
- 37 funcoes `SECURITY DEFINER` no schema `public`.
- Todas as 37 funcoes possuem `search_path` fixado.
- 8 funcoes `SECURITY DEFINER` podem ser executadas por usuarios anonimos.
- As 37 funcoes `SECURITY DEFINER` podem ser executadas por usuarios autenticados.
- `perfis_permissoes_sistema` e `usuarios_permissoes_sistema` possuem RLS, mas nenhuma politica direta.

## Interpretacao

As tabelas estao protegidas por RLS, inclusive o modulo de mapas. As duas tabelas de permissoes sem politicas ficam bloqueadas para acesso direto e dependem das RPCs administrativas. Esse desenho pode ser intencional, mas precisa ser confirmado com testes de perfil.

O risco principal esta na superficie das funcoes `SECURITY DEFINER`. O uso nao e automaticamente incorreto: consultas publicas por QR precisam funcionar sem login, e funcoes administrativas podem validar o usuario internamente. Mesmo assim, cada funcao executavel por `anon` ou `authenticated` precisa ter teste de autorizacao e concessao explicita apenas aos papeis necessarios.

## Proximas correcoes seguras

1. Testar as RPCs administrativas com um usuario comum e confirmar que todas recusam operacoes privilegiadas.
2. Revisar as oito RPCs publicas e limitar o retorno aos campos estritamente necessarios.
3. Revogar `EXECUTE` de `anon` e `authenticated` nas funcoes que nao fazem parte de fluxos publicos ou autenticados.
4. Manter as tabelas de permissao sem acesso direto caso todo uso continue passando por RPC validada.
5. Executar novamente os Security Advisors depois de qualquer mudanca de banco.

## Validacao ao vivo - 16/07/2026

A conferencia read-only do projeto Supabase confirmou que as RPCs administrativas principais nao estao liberadas para `anon` nem para `PUBLIC` e validam o usuario autenticado internamente.

Foi encontrada uma excecao: `admin_marcar_login_app_criado_sistema` aceitava execucao direta de qualquer usuario `authenticated` sem repetir a verificacao administrativa. A correcao local preparada faz duas mudancas coordenadas:

- a RPC passa a aceitar somente `service_role`;
- a Edge Function `admin-criar-login-app`, que ja valida o administrador solicitante, passa a chamar essa RPC pelo cliente administrativo.

O roteiro `supabase/sql/roteiro_seguranca_restringir_vinculo_login_app.sql` deve ser aplicado junto com a nova versao da Edge Function, depois da aprovacao para publicacao.

As consultas publicas por QR permanecem concedidas a `anon` somente nos fluxos que dependem de token. `consulta_publica_qr` nao retorna telefone de emergencia; informa apenas se o contato restrito existe. O acesso ao contato continua separado e protegido por senha.

## Barreira adicionada ao projeto

O comando `npm run check:database` agora impede novos roteiros com:

- tabela publica criada sem RLS no mesmo roteiro;
- uso de `auth.role()`;
- `GRANT ALL` para `anon` ou `public`;
- permissoes de alteracao ou exclusao concedidas diretamente a `anon` ou `public`.

Roteiros marcados explicitamente como proposta nao executavel sao inventariados, mas nao tratados como migracoes aplicaveis.
