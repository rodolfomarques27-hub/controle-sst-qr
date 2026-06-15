\# Manual do Administrador — Controle SST QR



Versão: v1.0.0-homologacao

Projeto: controle-sst-qr

Status: versão homologada e testada em produção



\## 1. Objetivo do sistema



O Controle SST QR é um sistema de gestão de Segurança do Trabalho criado para controlar empresas, colaboradores, documentos legais, treinamentos, QR Codes, auditorias de campo, auditoria do sistema, permissões de acesso e relatórios em PDF.



O sistema tem como objetivo centralizar as informações de SST, reduzir perda de documentos, facilitar consultas por QR Code e manter rastreabilidade das ações críticas realizadas pelos usuários.



\## 2. Responsabilidade do administrador



O administrador é responsável por manter o sistema organizado, seguro e atualizado.



As principais responsabilidades são:



\* cadastrar e revisar usuários;

\* aplicar perfis de acesso corretos;

\* bloquear usuários que não devem acessar o sistema;

\* aprovar ou recusar solicitações de acesso;

\* acompanhar logs na Auditoria do Sistema;

\* manter a aba Configurações protegida;

\* conferir backups e relatórios periodicamente;

\* evitar alterações sem diagnóstico e sem build aprovado.



\## 3. Login no sistema



O acesso ao sistema deve ser feito pela tela de login publicada na Vercel.



O usuário deve informar:



\* e-mail cadastrado;

\* senha definida ou senha temporária;

\* nova senha, quando houver troca obrigatória.



Se o usuário esquecer a senha, deve usar a opção de recuperação de senha disponível na tela de login.



\## 4. Perfis de acesso



O sistema trabalha com perfis para controlar o que cada usuário pode acessar.



Perfis principais:



\* Administrador;

\* Técnico SST;

\* Consulta;

\* Gestor;

\* Auditor;

\* Bloqueado.



O perfil Bloqueado impede o acesso ao sistema.



Sempre aplicar o menor nível de acesso necessário para cada usuário.



\## 5. Acessos do App



A aba Acessos do App deve ser usada para:



\* cadastrar novos usuários;

\* editar dados de usuários;

\* aplicar perfil;

\* bloquear ou desbloquear acesso;

\* definir senha temporária;

\* verificar empresa, função e e-mail;

\* revisar solicitações de acesso.



Sempre conferir se o e-mail está correto antes de criar ou editar um login.



\## 6. Solicitações de acesso



Quando um usuário tenta acessar uma área restrita sem permissão, o sistema pode registrar uma solicitação de acesso.



O administrador deve:



1\. abrir Auditoria do Sistema ou Acessos do App;

2\. localizar a solicitação;

3\. avaliar o perfil do usuário;

4\. aprovar ou recusar;

5\. conferir se o evento foi registrado nos logs.



Não aprovar solicitações sem confirmar a necessidade real do acesso.



\## 7. Auditoria do Sistema



A Auditoria do Sistema registra ações importantes realizadas no sistema.



O administrador deve acompanhar principalmente:



\* alterações em Configurações;

\* criação e edição de usuários;

\* bloqueio e desbloqueio de usuários;

\* solicitações de acesso;

\* alterações críticas de permissões;

\* geração ou uso de recursos sensíveis.



Os relatórios da Auditoria do Sistema devem ser exportados quando houver necessidade de rastreabilidade.



\## 8. Configurações



A aba Configurações deve permanecer protegida.



O desbloqueio da aba deve ser feito somente por usuário autorizado.



Após alterar configurações, o administrador deve conferir:



\* se os cards mantiveram o padrão aprovado;

\* se a alteração persistiu após atualizar a página;

\* se o evento foi registrado na Auditoria do Sistema.



Não alterar configurações em produção sem necessidade real.



\## 9. Regra para manutenção



Toda manutenção futura deve seguir o padrão aprovado:



1\. diagnosticar primeiro;

2\. alterar em microetapas;

3\. não substituir arquivos por versões antigas;

4\. aplicar pacote somente quando o escopo estiver claro;

5\. rodar `npm.cmd run build`;

6\. conferir `git status --short`;

7\. testar visualmente;

8\. commitar somente após aprovação;

9\. fazer push;

10\. conferir deploy na Vercel.



\## 10. Versão estável



A versão homologada do sistema está marcada com a tag:



`v1.0.0-homologacao`



Essa versão representa a base estável do projeto.



Antes de qualquer grande alteração futura, deve ser possível voltar para essa referência.



