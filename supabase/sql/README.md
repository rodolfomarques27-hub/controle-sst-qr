# Scripts SQL históricos e manuais

## Finalidade desta pasta

A pasta `supabase/sql` preserva scripts SQL criados durante etapas anteriores do desenvolvimento, correções manuais, diagnósticos e roteiros de implantação.

Esses arquivos não devem ser considerados automaticamente pendentes nem executados novamente sem análise técnica.

## Fonte oficial de migrations

As migrations oficiais e versionadas do projeto ficam em:

`supabase/migrations`

Toda nova alteração estrutural ou de segurança destinada ao ambiente de produção deve ser registrada como uma nova migration nessa pasta.

## Cuidados antes de executar um script histórico

Antes de executar qualquer arquivo desta pasta:

1. Confirmar se a alteração já foi aplicada ao banco.
2. Comparar o script com as migrations oficiais.
3. Verificar se o script é idempotente.
4. Revisar permissões, RLS, funções, triggers e políticas afetadas.
5. Não executar diretamente em produção sem diagnóstico e validação.

## Referências atuais que impedem movimentação imediata

Os seguintes arquivos do repositório ainda apontam diretamente para caminhos dentro de `supabase/sql`:

- `docs/auditoria-supabase-2026-07-16.md`
- `docs/checklist_etapa103_senha_configuracoes_supabase.txt`
- `docs/checklist_etapa97_qrcodes_campo.txt`
- `scripts/qualitySmokeTest.mjs`

O arquivo `scripts/qualitySmokeTest.mjs` utiliza diretamente:

- `etapa104_configuracao_fundo_login_banco.sql`
- `etapa104b_restringir_rpcs_fundo_login_anon.sql`

Esses arquivos não devem ser movidos enquanto as referências e os testes não forem atualizados e validados.

## Plano de organização

A reorganização desta pasta deverá ocorrer gradualmente:

1. Inventariar e classificar os scripts.
2. Identificar scripts já incorporados em migrations.
3. Atualizar referências documentais e automatizadas.
4. Mover apenas arquivos confirmados como históricos.
5. Validar testes, build e diferenças antes de cada commit.
