# Checklist mensal de backup e manutencao ? Controle SST QR

## Objetivo

Este checklist deve ser usado uma vez por mes para conferir se o sistema Controle SST QR continua protegido, documentado e com possibilidade de restauracao em caso de erro, perda de dados ou falha de deploy.

Versao base protegida:

```text
v1.0.0-homologacao
```

Branch de trabalho:

```text
melhoria-seguranca-auditoria
```

Repositorio:

```text
rodolfomarques27-hub/controle-sst-qr
```

---

## 1. Regras gerais

Antes de qualquer manutencao mensal, confirmar:

- O sistema esta funcionando no ambiente publicado.
- O Git local esta limpo.
- A branch correta esta selecionada.
- Nao existem arquivos ZIP soltos no projeto.
- A documentacao esta atualizada.
- A versao estavel continua protegida.

Fluxo obrigatorio para qualquer melhoria futura:

```text
diagnostico > microetapa > build > teste visual > commit > push > Vercel
```

---

## 2. Conferencia inicial do projeto local

Rodar no terminal:

```powershell
git status --short
git log -5 --oneline
Get-ChildItem .\docs
```

Resultado esperado do status:

```text
sem retorno
```

Se aparecer arquivo temporario, ZIP ou arquivo desconhecido, nao commitar antes de revisar.

Exemplo de arquivo que nao deve ir para o GitHub:

```text
?? roteiro-algum-pacote.zip
?? diagnostico-temporario.zip
```

Remover ZIP temporario, quando confirmado que nao precisa mais:

```powershell
Remove-Item .\nome-do-arquivo.zip -Force
```

---

## 3. Conferencia do GitHub

Verificar no GitHub:

- Branch de trabalho atualizada.
- Ultimo commit local igual ao ultimo commit remoto.
- Nao existem arquivos temporarios enviados por engano.
- Documentos em docs/ estao presentes.
- Backlog continua atualizado.

Comandos locais:

```powershell
git status --short
git log -5 --oneline
```

---

## 4. Conferencia da Vercel

Verificar:

```text
Vercel > Project > Deployments
```

Resultado esperado:

```text
Ready / Production
```

Conferir tambem:

- Deploy mais recente sem erro.
- Site publicado abrindo normalmente.
- Login funcionando.
- Aba Manuais abrindo.
- Dashboard carregando.
- Nenhuma tela critica quebrada.

---

## 5. Conferencia do Supabase

Conferir no Supabase:

- Projeto correto: koukyzczwttemgmloagt.
- Auth funcionando.
- Tabelas principais acessiveis.
- Storage acessivel.
- Edge Functions sem erro aparente.

Tabelas principais para lembrar:

- empresas
- colaboradores
- documentos_empresas
- certificados_treinamentos
- auditorias_campo
- auditoria_campo_desvios
- usuarios_acessos_app
- auditoria_sistema
- emails_enviados

Buckets principais para lembrar:

- certificados-treinamentos
- documentos-empresas
- contratos-empresas
- logos-empresas
- fotos-colaboradores
- auditorias-campo

---

## 6. Backup do banco Supabase

Uma vez por mes, conferir se existe backup recente do banco.

Itens para validar:

- Backup das tabelas principais.
- Backup das funcoes SQL importantes.
- Backup das politicas RLS.
- Backup das configuracoes criticas.
- Registro da data do ultimo backup.

Checklist:

```text
[ ] Backup do banco conferido
[ ] Data do backup registrada
[ ] Backup armazenado fora do computador principal
[ ] Restauracao teorica revisada
[ ] Nenhuma alteracao critica pendente sem backup
```

---

## 7. Backup do Storage Supabase

Conferir os arquivos enviados pelos usuarios.

Checklist:

```text
[ ] Certificados conferidos
[ ] Documentos de empresas conferidos
[ ] Fotos de colaboradores conferidas
[ ] Fotos de auditoria conferidas
[ ] Logos de empresas conferidas
[ ] Contratos conferidos
```

Observacao:

Nao excluir arquivos do Storage sem diagnostico e sem confirmar se ainda existem referencias no banco.

---

## 8. Backup das variaveis da Vercel

Conferir se as variaveis de ambiente estao documentadas em local seguro.

Checklist:

```text
[ ] Variaveis da Vercel conferidas
[ ] Chaves criticas armazenadas em local seguro
[ ] Nenhuma chave exposta no codigo
[ ] Nenhuma chave enviada ao GitHub
[ ] Variaveis batem com o ambiente de producao
```

Nunca colocar chaves reais dentro de arquivos do repositorio.

---

## 9. Backup local do projeto

Conferir se a pasta local esta organizada:

```text
C:\Users\rdf_l\OneDrive\?rea de Trabalho\controle-sst-qr
```

Checklist:

```text
[ ] Pasta local abre normalmente
[ ] npm.cmd run build funciona
[ ] node_modules nao precisa ser enviado ao Git
[ ] dist nao precisa ser enviado ao Git, salvo configuracao especifica
[ ] ZIPs temporarios removidos
[ ] Documentacao atualizada
```

---

## 10. Teste rapido mensal do sistema

Testar no sistema publicado:

```text
[ ] Login
[ ] Dashboard SST
[ ] Empresas
[ ] Colaboradores
[ ] Treinamentos
[ ] QR Code
[ ] Auditoria de Campo
[ ] Auditoria do Sistema
[ ] Acessos do App
[ ] Configuracoes
[ ] Manuais
```

Se alguma tela falhar, abrir um roteiro proprio para diagnostico antes de mexer no codigo.

---

## 11. Registro mensal

Preencher manualmente a cada revisao:

```text
Mes/Ano:
Data da revisao:
Responsavel:
Ultimo commit conferido:
Deploy Vercel:
Backup banco:
Backup Storage:
Backup variaveis:
Observacoes:
Pendencias encontradas:
Proximo passo:
```

---

## 12. Quando criar um novo roteiro

Criar novo roteiro separado se for encontrado:

- Erro de build.
- Erro no deploy.
- Tela quebrada.
- Falha de permissao.
- Problema em QR Code.
- Problema em arquivos do Storage.
- Problema em documentos ou certificados.
- Usuario com acesso incorreto.
- Backup ausente ou desatualizado.

Nunca corrigir tudo junto.

Cada problema deve seguir:

```text
diagnostico > microetapa > build > teste visual > commit > push > Vercel
```

---

## 13. Status deste checklist

Status inicial:

```text
Criado no Roteiro 25
```

Este arquivo deve ser revisado e melhorado conforme o sistema evoluir.
