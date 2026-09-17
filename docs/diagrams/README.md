# Diagramas do Jornix

Os arquivos desta pasta são diagramas editáveis do Excalidraw. Eles usam a paleta visual definida pela skill de diagramas e documentam os fluxos que sustentam a aplicação.

- [Arquitetura](./architecture.excalidraw): navegador, App Router, serviços, Prisma e Supabase.
- [Ciclo de registros](./time-entry-lifecycle.excalidraw): várias entradas e saídas no mesmo dia e a apuração dos pares efetivos.
- [Aprovação de ajustes](./adjustment-approval.excalidraw): solicitação, validação no escopo afetado, decisão e atualização do resumo.

As prévias em SVG ficam disponíveis ao lado de cada arquivo para leitura rápida no navegador.

Para regenerar os arquivos depois de alterar o conteúdo, execute:

```text
py -3 scripts/generate-excalidraw-diagrams.py
```
