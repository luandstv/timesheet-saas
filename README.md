# Timesheet SaaS

Projeto inicial do Timesheet SaaS. Pilha e status atuais:

- Next.js 16 (app router)
- Tailwind CSS
- Prisma + PostgreSQL (cliente em `src/lib/prisma.ts`)

O que foi implementado até agora

- Estrutura base do app: `src/app/layout.tsx`, `src/app/page.tsx`.
- Cliente Prisma configurado e esquema do domínio em `prisma/schema.prisma` com modelos principais: User, Timesheet, TimeEntry, TimeEntryAdjustment, Activity, onCallSchedule, UserSalaryConfig, Holiday, Absences.
- Scaffolds e diretórios criados para API, componentes e lógica de domínio:
  - `src/app/api/` (API routes)
  - `src/components/shared/` (componentes compartilhados)
  - `src/components/ui/` (UI primitives)
  - `src/hooks/`, `src/services/`, `src/schemas/`, `src/types/`
- Configuração de workspace `pnpm` e arquivo `prisma.config.ts` para migrações.

Como rodar localmente

1. Instalar dependências:

```bash
pnpm install
```

2. Configurar variáveis de ambiente (exemplo em `.env`):

- `DATABASE_URL` — string de conexão para o Prisma no app
- `DIRECT_URL` — URL usada pelas migrações do Prisma

3. Rodar o app em desenvolvimento:

```bash
pnpm dev
```

4. Abrir `http://localhost:3000`.

Observações sobre o banco

- As migrations estão em `prisma/migrations`.
- O generator Prisma client emite o cliente em `generated/prisma`.

Próximos passos sugeridos

- Implementar endpoints REST/GraphQL em `src/app/api` para timesheets, lançamentos e absências.
- Implementar autenticação/autorizações (roles: ADMIN, MANAGER, COLLABORATOR).
- Criar componentes e hooks para registro de ponto e visualização de timesheets.
- Testes e CI/CD.

Contribuições

Sinta-se à vontade para abrir issues ou PRs com melhorias e correções.
