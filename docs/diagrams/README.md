# Diagramas do Jornix

Os arquivos desta pasta são diagramas editáveis do Excalidraw. Eles usam a paleta visual definida pela skill de diagramas e documentam os fluxos que sustentam a aplicação. O diagrama de segurança inclui o endpoint real usado no teste e a resposta `401/42501`.

- [Arquitetura](./architecture.excalidraw): navegador, App Router, serviços, Prisma e Supabase.
- [Ciclo de registros](./time-entry-lifecycle.excalidraw): várias entradas e saídas no mesmo dia e a apuração dos pares efetivos.
- [Aprovação de ajustes](./adjustment-approval.excalidraw): solicitação, validação no escopo afetado, decisão e atualização do resumo.
- [Fronteira do Data API](./data-api-rls.excalidraw): caminho público bloqueado por RLS/grants e caminho interno do Prisma.

As prévias em SVG ficam disponíveis ao lado de cada arquivo para leitura rápida no navegador.
Para a fronteira do Data API, abra a [prévia SVG](./data-api-rls.svg) ou o arquivo editável no Excalidraw.

Para regenerar os arquivos depois de alterar o conteúdo, execute:

```text
py -3 scripts/generate-excalidraw-diagrams.py
```

O script regenera os arquivos editáveis `.excalidraw`; as prévias SVG são
artefatos versionados para leitura rápida e devem ser atualizadas junto com o
diagrama correspondente.
