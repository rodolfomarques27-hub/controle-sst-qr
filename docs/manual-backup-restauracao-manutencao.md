\# Manual de Backup, Restauração e Manutenção — Controle SST QR



Versão: v1.0.0-homologacao

Projeto: controle-sst-qr

Status: versão homologada e testada em produção



\## 1. Objetivo



Este manual define a rotina de backup, restauração e manutenção do sistema Controle SST QR.



O objetivo é garantir que a versão homologada possa ser preservada, restaurada e mantida com segurança, evitando perda de código, banco de dados, arquivos do Storage, variáveis de ambiente e configurações importantes.



\## 2. Itens que devem ser protegidos



A versão estável do sistema depende dos seguintes itens:



\* código-fonte do projeto;

\* histórico Git;

\* tag da versão homologada;

\* banco de dados Supabase;

\* arquivos do Supabase Storage;

\* variáveis de ambiente da Vercel;

\* deploy publicado;

\* documentação operacional;

\* pacotes de correção utilizados no desenvolvimento.



\## 3. Versão estável



A versão homologada está marcada com a tag:



`v1.0.0-homologacao`



Essa tag representa a base aprovada do sistema em produção.



Antes de iniciar alterações grandes, deve-se confirmar:



```powershell

git status --short

git log -5 --oneline

git tag

```



A branch principal de trabalho homologada é:



`melhoria-seguranca-auditoria`



\## 4. Estrutura de backup local



A pasta de backup da versão homologada deve seguir a estrutura:



```text

backups/

&#x20; v1.0.0-homologacao/

&#x20;   controle-sst-qr-codigo-v1.0.0-homologacao.zip

&#x20;   controle-sst-qr-v1.0.0-homologacao.bundle

&#x20;   supabase/

&#x20;     database/

&#x20;       schema.sql

&#x20;       data.sql

&#x20;       full.sql

&#x20;     storage/

&#x20;       auditorias-campo/

&#x20;       certificados-treinamentos/

&#x20;       contratos-empresas/

&#x20;       documentos-empresas/

&#x20;       fotos-colaboradores/

&#x20;       logos-empresas/

&#x20;   vercel/

&#x20;     vercel-env-v1.0.0-homologacao.txt

&#x20; controle-sst-qr-backup-completo-v1.0.0-homologacao.zip

```



A pasta `backups/` não deve ser enviada ao GitHub.



\## 5. Backup do código



O backup do código deve conter:



\* pasta `src`;

\* pasta `public`;

\* pasta `supabase`;

\* `package.json`;

\* `package-lock.json`;

\* `vite.config.js`;

\* `index.html`.



Comando usado para gerar o ZIP do código:



```powershell

Compress-Archive -Force -Path `

".\\src", `

".\\public", `

".\\supabase", `

".\\package.json", `

".\\package-lock.json", `

".\\vite.config.js", `

".\\index.html" `

\-DestinationPath ".\\backups\\v1.0.0-homologacao\\controle-sst-qr-codigo-v1.0.0-homologacao.zip"

```



\## 6. Backup Git bundle



O Git bundle permite restaurar o histórico completo do repositório.



Comando usado:



```powershell

git bundle create .\\backups\\v1.0.0-homologacao\\controle-sst-qr-v1.0.0-homologacao.bundle --all

```



Para conferir:



```powershell

Get-ChildItem .\\backups\\v1.0.0-homologacao

```



\## 7. Backup da Vercel



O backup das variáveis de ambiente da Vercel deve ser salvo em:



```text

backups/v1.0.0-homologacao/vercel/vercel-env-v1.0.0-homologacao.txt

```



Comando usado:



```powershell

npx.cmd vercel@latest env pull .\\backups\\v1.0.0-homologacao\\vercel\\vercel-env-v1.0.0-homologacao.txt --environment=production

```



Esse arquivo pode conter variáveis sensíveis e não deve ser enviado ao GitHub.



\## 8. Backup do Supabase Storage



O Storage deve ser copiado separadamente do banco.



Buckets principais:



\* auditorias-campo;

\* certificados-treinamentos;

\* contratos-empresas;

\* documentos-empresas;

\* fotos-colaboradores;

\* logos-empresas.



A estrutura esperada é:



```text

backups/v1.0.0-homologacao/supabase/storage/

&#x20; auditorias-campo/

&#x20; certificados-treinamentos/

&#x20; contratos-empresas/

&#x20; documentos-empresas/

&#x20; fotos-colaboradores/

&#x20; logos-empresas/

```



Cada bucket deve ser baixado pelo painel Supabase, S3/Cyberduck ou ferramenta equivalente.



\## 9. Backup do banco Supabase



O backup do banco deve ser salvo em:



```text

backups/v1.0.0-homologacao/supabase/database/

```



Arquivos principais:



\* `schema.sql`;

\* `data.sql`;

\* `full.sql`.



O arquivo `full.sql` é o backup completo mais importante.



Comandos usados com PostgreSQL Client:



```powershell

\& "C:\\Program Files\\PostgreSQL\\17\\bin\\pg\_dump.exe" `

&#x20; -h db.koukyzczwttemgmloagt.supabase.co `

&#x20; -p 5432 `

&#x20; -U postgres `

&#x20; -d postgres `

&#x20; --schema-only `

&#x20; -f .\\backups\\v1.0.0-homologacao\\supabase\\database\\schema.sql

```



```powershell

\& "C:\\Program Files\\PostgreSQL\\17\\bin\\pg\_dump.exe" `

&#x20; -h db.koukyzczwttemgmloagt.supabase.co `

&#x20; -p 5432 `

&#x20; -U postgres `

&#x20; -d postgres `

&#x20; --data-only `

&#x20; --inserts `

&#x20; -f .\\backups\\v1.0.0-homologacao\\supabase\\database\\data.sql

```



```powershell

\& "C:\\Program Files\\PostgreSQL\\17\\bin\\pg\_dump.exe" `

&#x20; -h db.koukyzczwttemgmloagt.supabase.co `

&#x20; -p 5432 `

&#x20; -U postgres `

&#x20; -d postgres `

&#x20; -f .\\backups\\v1.0.0-homologacao\\supabase\\database\\full.sql

```



A senha do banco nunca deve ser salva em comando, print ou conversa.



\## 10. ZIP mestre do backup



Após concluir código, Git, Vercel, banco e Storage, gerar um ZIP mestre:



```powershell

Compress-Archive -Force -Path `

".\\backups\\v1.0.0-homologacao" `

\-DestinationPath ".\\backups\\controle-sst-qr-backup-completo-v1.0.0-homologacao.zip"

```



Esse ZIP não deve ser enviado ao GitHub.



Deve ser copiado para:



\* HD externo;

\* pendrive;

\* OneDrive/Google Drive privado;

\* pasta segura fora do projeto.



\## 11. Restauração do código



Para restaurar o código usando o ZIP:



1\. criar uma nova pasta;

2\. extrair `controle-sst-qr-codigo-v1.0.0-homologacao.zip`;

3\. instalar dependências;

4\. configurar `.env.local`;

5\. rodar build.



Comandos principais:



```powershell

npm install

npm.cmd run build

```



\## 12. Restauração via Git bundle



Para restaurar usando o bundle:



```powershell

git clone .\\controle-sst-qr-v1.0.0-homologacao.bundle controle-sst-qr-restaurado

```



Depois entrar na pasta:



```powershell

cd .\\controle-sst-qr-restaurado

git log -5 --oneline

git tag

```



\## 13. Restauração do banco



A restauração do banco deve ser feita com cautela, preferencialmente em ambiente de teste antes de produção.



Ordem recomendada:



1\. restaurar estrutura com `schema.sql` ou usar `full.sql`;

2\. restaurar dados;

3\. conferir tabelas;

4\. conferir RLS/policies;

5\. conferir funções/RPC;

6\. testar login;

7\. testar telas principais;

8\. testar Storage;

9\. testar relatórios.



Nunca restaurar diretamente em produção sem backup atual antes.



\## 14. Restauração do Storage



Para restaurar Storage:



1\. criar buckets no Supabase com os mesmos nomes;

2\. manter políticas de acesso corretas;

3\. reenviar arquivos para os mesmos caminhos;

4\. testar abertura de documentos;

5\. testar fotos de colaboradores;

6\. testar logos;

7\. testar certificados;

8\. testar fotos de auditoria.



Buckets:



```text

auditorias-campo

certificados-treinamentos

contratos-empresas

documentos-empresas

fotos-colaboradores

logos-empresas

```



\## 15. Rotina mensal de manutenção



Uma vez por mês, executar:



```powershell

git status --short

npm.cmd run build

git log -5 --oneline

```



Também conferir:



\* Vercel Production ativo;

\* Supabase funcionando;

\* Storage com arquivos acessíveis;

\* PDFs principais gerando;

\* logs da Auditoria do Sistema;

\* usuários bloqueados/inativos;

\* documentos vencidos;

\* treinamentos vencidos;

\* QR público funcionando.



\## 16. Rotina mensal de backup



Mensalmente gerar:



\* novo Git bundle;

\* novo ZIP do código;

\* novo backup do banco;

\* novo backup do Storage;

\* backup das variáveis da Vercel;

\* ZIP mestre atualizado.



Nome recomendado:



```text

controle-sst-qr-backup-completo-AAAA-MM.zip

```



\## 17. Regra para futuras atualizações



Toda atualização futura deve seguir o padrão:



1\. diagnóstico primeiro;

2\. microetapas;

3\. escopo pequeno;

4\. não alterar áreas aprovadas sem necessidade;

5\. não substituir arquivo por versão antiga;

6\. aplicar pacote somente com caminho correto;

7\. rodar build;

8\. testar visualmente;

9\. conferir Git;

10\. commitar com mensagem clara;

11\. push;

12\. conferir Vercel.



\## 18. Comandos padrão de Git



Após build aprovado:



```powershell

git add .\\caminho\\do\\arquivo

git status --short

git commit -m "mensagem clara"

git push

```



Nunca copiar para o terminal as linhas de saída do Git, como:



```text

M arquivo

A arquivo

Enumerating objects

Counting objects

HEAD

```



Essas linhas são apenas resultado, não comandos.



\## 19. Observação de segurança



Não compartilhar:



\* senha do banco;

\* variáveis da Vercel;

\* `.env.local`;

\* backup completo;

\* links de login CLI;

\* tokens;

\* chaves secretas;

\* service role key;

\* arquivos `.sql` com dados reais.



Esses itens devem ficar apenas em local seguro.



