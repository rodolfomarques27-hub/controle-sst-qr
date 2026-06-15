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
Status: conclu?do no Roteiro 23

Melhorias aplicadas:

* bot?o para copiar passo a passo;
* melhoria na mensagem de busca sem resultado;
* bot?es de exemplo quando a busca n?o encontra item;
* corre??o de acentua??o nos textos dos Manuais;
* bot?o para limpar busca;
* valida??o visual no desktop e mobile.

Commits relacionados:

* a12cd7f feat: adicionar copia de passo a passo nos manuais
* 24e8a7c feat: melhorar busca sem resultado nos manuais
* 72b59b7 fix: corrigir acentuacao nos manuais
* 228dcbf feat: adicionar limpar busca nos manuais

Observa??o: melhoria conclu?da sem alterar permiss?es internas, rotas, Supabase, banco ou App.jsx.

\### 4.2 Revisão mensal de backup



Prioridade: Alta

Status: planejado



Melhorias possíveis:



\* criar lembrete mensal de backup;

\* revisar se o backup local continua atualizado;

\* validar backup do banco Supabase;

\* validar backup do Storage;

\* validar backup das variáveis da Vercel;

\* manter cópia fora do computador principal.



\### 4.3 Melhorar auditoria de permissões



Prioridade: Alta

Status: planejado



Melhorias possíveis:



\* criar tela mais clara para visualizar o que cada perfil pode acessar;

\* destacar usuários bloqueados;

\* mostrar último acesso do usuário;

\* mostrar quem aprovou solicitação de acesso;

\* revisar usuários antigos ou inativos.



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



Roteiro 25 ? Criar checklist mensal de backup e manuten??o



A melhoria só deve sair do backlog depois de escolhida, planejada e aprovada.



