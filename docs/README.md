\# Documentação — Controle SST QR



Versão: v1.0.0-homologacao

Projeto: controle-sst-qr

Status: versão homologada, publicada, testada e documentada



\## 1. Objetivo



Esta pasta reúne a documentação oficial do sistema Controle SST QR.



A documentação deve ser utilizada para operação, administração, manutenção, backup, restauração e futuras atualizações do sistema.



\## 2. Manuais disponíveis



\### Manual do Administrador



Arquivo:



`manual-administrador.md`



Conteúdo principal:



\* visão geral do sistema;

\* responsabilidades do administrador;

\* login;

\* perfis de acesso;

\* Acessos do App;

\* solicitações de acesso;

\* Auditoria do Sistema;

\* Configurações;

\* regra de manutenção;

\* versão estável.



\### Manual Operacional das Abas



Arquivo:



`manual-operacional-abas.md`



Conteúdo principal:



\* Dashboard SST;

\* Empresas e Documentos;

\* Colaboradores;

\* Treinamentos;

\* QR Público;

\* Auditoria de Campo;

\* Dashboard Auditoria Campo;

\* Auditoria do Sistema;

\* Configurações;

\* Relatórios PDF;

\* regra operacional para erros.



\### Manual de Backup, Restauração e Manutenção



Arquivo:



`manual-backup-restauracao-manutencao.md`



Conteúdo principal:



\* estrutura de backup;

\* backup do código;

\* Git bundle;

\* Vercel ENV;

\* Supabase Storage;

\* Supabase Database;

\* ZIP mestre;

\* restauração do código;

\* restauração do banco;

\* restauração do Storage;

\* rotina mensal;

\* regras para atualizações futuras;

\* observações de segurança.



\### Checklist mensal de Backup e Manuten\u00e7\u00e3o

Arquivo:

`checklist-mensal-backup-manutencao.md`

Conte\u00fado principal:

\* confer\u00eancia mensal do projeto local;

\* confer\u00eancia do GitHub;

\* confer\u00eancia da Vercel;

\* confer\u00eancia do Supabase;

\* backup do banco;

\* backup do Storage;

\* backup das vari\u00e1veis da Vercel;

\* teste r\u00e1pido mensal do sistema;

\* registro mensal de revis\u00e3o;

\* regra para abertura de novo roteiro.

\## 3. Versão estável



A versão homologada está marcada no Git com a tag:



`v1.0.0-homologacao`



Essa tag representa a base aprovada do sistema.



\## 4. Branch principal de trabalho



Branch utilizada na homologação:



`melhoria-seguranca-auditoria`



\## 5. Regra de uso da documentação



Antes de qualquer alteração no sistema:



1\. consultar os manuais;

2\. confirmar o estado do Git;

3\. diagnosticar o problema;

4\. alterar em microetapas;

5\. rodar build;

6\. testar visualmente;

7\. commitar somente após aprovação;

8\. conferir deploy na Vercel.



\## 6. Comandos básicos de conferência



```powershell

git status --short

git log -5 --oneline

npm.cmd run build

```



\## 7. Observação de segurança



Não armazenar no GitHub:



\* arquivos `.env`;

\* variáveis da Vercel;

\* backups completos;

\* arquivos `.sql` com dados reais;

\* tokens;

\* senhas;

\* chaves secretas;

\* arquivos da pasta `backups/`.



