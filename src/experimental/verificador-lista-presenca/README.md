# Verificador experimental de lista de presença

Esta pasta preserva a implementação experimental do verificador de listas de presença por tabela interna de PDF e OCR local.

## Estado

- Não participa do fluxo ativo da aplicação.
- Não deve ser importada por telas de produção.
- O componente usado em produção permanece em `src/components/VerificadorListaPresenca.jsx` e retorna `null`.
- A implementação foi preservada para eventual revisão técnica controlada.

## Conteúdo

- `VerificadorListaPresencaExperimental.jsx`
- `usePdfOcr.js`
- `usePdfTabelaListaPresenca.js`
- `useVerificarListaPresenca.js`
- `listaPresencaPdfTabelaUtils.js`
- `listaPresencaPlanilhaUtils.js`

O serviço `src/services/documentosOcrService.js` permanece na estrutura principal porque também é utilizado por fluxos ativos de documentos.
