# Design System - Controle SST QR

Padrao visual obrigatorio para todas as telas do SafeScan Brasil / Controle SST QR.

Baseado no layout aprovado do Dashboard SST.

## 1. Tokens oficiais

```css
:root {
  --color-primary:        #1E7C3A;
  --color-primary-dark:   #155C2B;
  --color-primary-light:  #E8F5EC;
  --color-sidebar-bg:     #1A2332;
  --color-sidebar-text:   #A8B8C8;
  --color-sidebar-active: #FFFFFF;
  --color-page-bg:        #F4F6F9;
  --color-card-bg:        #FFFFFF;
  --color-text-primary:   #1A2332;
  --color-text-secondary: #6B7A8D;
  --color-warning:        #F59E0B;
  --color-danger:         #EF4444;
  --color-border:         #E5E9EF;
  --color-topbar-bg:      #FFFFFF;

  --font-family:          'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-xs:         11px;
  --font-size-sm:         12px;
  --font-size-base:       14px;
  --font-size-md:         16px;
  --font-size-lg:         18px;
  --font-size-xl:         24px;
  --font-size-kpi:        32px;

  --gap-xs:               8px;
  --gap-sm:               12px;
  --gap-md:               16px;
  --gap-lg:               24px;
  --gap-xl:               32px;

  --radius-sm:            6px;
  --radius-md:            8px;
  --radius-lg:            12px;
  --radius-xl:            16px;
  --radius-pill:          20px;

  --shadow-sm:            0 1px 4px rgba(0,0,0,0.06);
  --shadow-md:            0 4px 12px rgba(0,0,0,0.10);

  --sidebar-width:        220px;
  --sidebar-collapsed:    64px;
  --topbar-height:        64px;
}
```

## 2. Regras obrigatorias

1. Sidebar sempre presente com item ativo em verde.
2. Topbar sempre presente com titulo da tela e botoes de acao a direita.
3. Fundo geral sempre #F4F6F9.
4. Cards sempre brancos, com border-radius de 12px e sombra leve.
5. Fonte unica: Inter ou sans-serif equivalente.
6. Verde #1E7C3A reservado para CTA, item ativo, status positivo e links de acao.
7. Badges sempre em formato pill.
8. Botoes com icone a esquerda quando houver acao clara.
9. Tabelas com cabecalho claro, texto uppercase e divisores sutis.
10. Datas sempre em DD/MM/AAAA.
11. Hero banner apenas no Dashboard SST ou quando fizer sentido.
12. Telas internas usam topbar, cards e secoes padronizadas.
13. Antes de qualquer alteracao visual, deve existir mockup/imagem de referencia aprovado pelo usuario.
14. Nenhuma alteracao visual deve ser publicada em producao sem autorizacao explicita.

## 3. Aplicacao por fases

1. Documentar Design System.
2. Criar base global de tokens CSS.
3. Ajustar layout principal: AppLayout e AppSidebar.
4. Ajustar Dashboard SST.
5. Ajustar abas internas uma por vez.
6. Substituir alertas nativos por toast/snackbar em etapa separada.

## 4. Observacao de seguranca

Este padrao altera apenas visual quando aplicado nas primeiras fases. Nao deve alterar Supabase, permissoes, rotas, formularios, regras de negocio, QR publico, uploads ou fluxos de salvamento.
