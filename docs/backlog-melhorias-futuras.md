\# Backlog de Melhorias Futuras — Controle SST QR



Versão base protegida: v1.0.0-homologacao

Branch de trabalho: melhoria-seguranca-auditoria

Status: ideias futuras, sem alteração na versão estável



\## 1. Objetivo



Este documento reúne ideias de melhorias futuras para o sistema Controle SST QR.



Nenhuma melhoria listada aqui deve ser aplicada diretamente no sistema sem antes passar por diagnóstico, planejamento, microetapas, build, teste visual e aprovação.



\## 2. Regra principal



A versão estável não deve ser alterada sem necessidade real.



Toda melhoria futura deve seguir este padrão:



1\. registrar a ideia no backlog;

2\. definir prioridade;

3\. separar em etapas pequenas;

4\. identificar arquivos afetados;

5\. aplicar uma alteração por vez;

6\. rodar build;

7\. testar visualmente;

8\. commitar somente após aprovação;

9\. conferir deploy na Vercel.



\## 3. Prioridades



Usar a classificação abaixo:



\* Alta: melhoria importante para segurança, estabilidade ou uso diário.

\* Média: melhoria útil, mas que pode aguardar.

\* Baixa: melhoria visual, conforto ou ideia futura.



\## 4. Melhorias futuras — Alta prioridade



### 4.1 Refinar Central de Ajuda / Manuais

Prioridade: Alta
Status: concluído no Roteiro 23

Melhorias aplicadas:

* botão para copiar passo a passo;
* melhoria na mensagem de busca sem resultado;
* botões de exemplo quando a busca não encontra item;
* correção de acentuação nos textos dos Manuais;
* botão para limpar busca;
* validação visual no desktop e mobile.

Commits relacionados:

* a12cd7f feat: adicionar copia de passo a passo nos manuais
* 24e8a7c feat: melhorar busca sem resultado nos manuais
* 72b59b7 fix: corrigir acentuacao nos manuais
* 228dcbf feat: adicionar limpar busca nos manuais

Observação: melhoria concluída sem alterar permissões internas, rotas, Supabase, banco ou App.jsx.

### 4.2 Revisão mensal de backup

Prioridade: Alta
Status: concluído no Roteiro 25

Melhoria aplicada:

* criado checklist mensal de backup e manutenção;
* checklist incluído no índice da documentação;
* rotina mensal documentada para Git, GitHub, Vercel, Supabase, Storage e variáveis;
* registro mensal de revisão incluído;
* regra para abertura de novo roteiro documentada.

Arquivos relacionados:

* docs/checklist-mensal-backup-manutencao.md
* docs/README.md

Commits relacionados:

* 0daa67e docs: adicionar checklist mensal de backup e manutencao
* b846a9f docs: adicionar checklist mensal ao indice

Observação: melhoria concluída apenas em documentação, sem alteração em código, Supabase, banco, permissões, rotas ou App.jsx.

### 4.3 Melhorar auditoria de permissões

Prioridade: Alta
Status: concluído no Roteiro 30B

Melhoria aplicada:

* diagnóstico dos arquivos de acessos, permissões, perfis e solicitações;
* identificação da tela principal `src/components/acessos/AcessosAppPage.jsx`;
* identificação do service principal `src/services/usuariosPermissoesSistemaService.js`;
* resposta administrativa passou a aparecer nos cards de solicitação de acesso;
* data de atualização da solicitação passou a aparecer no card;
* banco/RPC atualizado para registrar responsáveis por aprovação, recusa e conclusão;
* campos adicionados para e-mail, nome e data/hora de cada ação administrativa;
* front-end atualizado para exibir Histórico administrativo no card da solicitação;
* validação visual aprovada no desktop, mobile e sistema publicado;
* sem alteração em App.jsx ou rotas principais.

Commits relacionados:

* 18d6cbf feat: mostrar resposta administrativa em solicitacoes
* c5f378c docs: marcar validacao mobile da auditoria de permissoes
* e13cb66 sql: preparar auditoria de responsaveis por solicitacoes
* 162b66c feat: exibir responsaveis nas solicitacoes de acesso
* 4f9ded6 docs: concluir auditoria de permissoes no backlog

Observação: melhoria concluída. O sistema agora registra e exibe quem aprovou, recusou ou concluiu solicitações de acesso.

\## 5. Melhorias futuras — Média prioridade



\### 5.1 Melhorar relatórios com filtros salvos



Prioridade: Média

Status: planejado



Melhorias possíveis:



\* salvar filtros usados com frequência;

\* gerar relatório com filtro pré-definido;

\* criar modelo de relatório por empresa;

\* criar modelo de relatório mensal.



\### 5.2 Melhorar Dashboard SST



Prioridade: Média

Status: planejado



Melhorias possíveis:



\* adicionar visão mensal;

\* adicionar cards de tendência;

\* melhorar leitura dos gráficos;

\* criar atalho direto para pendências críticas;

\* melhorar visual mobile.



\### 5.3 Melhorar Dashboard Auditoria Campo



Prioridade: Média

Status: planejado



Melhorias possíveis:



\* adicionar filtro por responsável;

\* adicionar visão por período;

\* destacar desvios críticos;

\* melhorar ranking por empresa;

\* melhorar ranking por área/local.



\### 5.4 Melhorar Treinamentos



Prioridade: Média

Status: planejado



Melhorias possíveis:



\* melhorar leitura de certificados;

\* criar alertas por treinamento próximo do vencimento;

\* melhorar tela de documento sendo analisado;

\* separar documentos por tipo de NR;

\* melhorar conferência de colaborador errado.



\## 6. Melhorias futuras — Baixa prioridade



\### 6.1 Melhorias visuais gerais



Prioridade: Baixa

Status: planejado



Melhorias possíveis:



\* revisar espaçamentos;

\* padronizar alguns textos;

\* melhorar ícones;

\* melhorar animações suaves;

\* refinar cards em telas secundárias.



\### 6.2 Melhorar experiência mobile



Prioridade: Baixa

Status: planejado



Melhorias possíveis:



\* revisar cards no celular;

\* melhorar botões em telas menores;

\* melhorar tabelas em mobile;

\* reduzir excesso de rolagem;

\* testar telas principais no celular.



\### 6.3 Criar tutoriais com imagens



Prioridade: Baixa

Status: ideia futura



Melhorias possíveis:



\* criar imagens explicativas para Manuais;

\* adicionar prints das telas;

\* criar tutorial por aba;

\* criar versão PDF do manual simples para usuários.



\## 7. Ideias que devem aguardar



As ideias abaixo não devem ser aplicadas agora:



\* troca grande de layout;

\* alteração de banco;

\* mudança de permissões;

\* mudança de rota interna;

\* troca de estrutura de login;

\* automação complexa sem planejamento;

\* alteração em Supabase sem backup atualizado.



\## 8. Próximo roteiro sugerido



Próximo roteiro após este backlog:



Roteiro 25 — Criar checklist mensal de backup e manutenção



A melhoria só deve sair do backlog depois de escolhida, planejada e aprovada.

