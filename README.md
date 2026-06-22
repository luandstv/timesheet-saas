# Timesheet SaaS

Projeto inicial de Timesheet SaaS usando Next.js 16, Tailwind CSS e Prisma com PostgreSQL.

## O que já está implementado

- Estrutura base de aplicativo Next.js com `app/layout.tsx` e `app/page.tsx`.
- Cliente Prisma configurado em `src/lib/prisma.ts` usando `@prisma/adapter-pg`.
- Esquema Prisma em `prisma/schema.prisma` com modelos de domínio:
  - `User`, `Timesheet`, `TimeEntry`, `TimeEntryAdjustment`, `Activity`, `onCallSchedule`, `UserSalaryConfig`, `Holiday`, `Absences`
- Diretórios de scaffold criados para os próximos módulos:
  - `src/app/api`
  - `src/components/shared`
  - `src/hooks`
  - `src/schemas`
  - `src/services`
  - `src/types`
- Configuração de workspace `pnpm` e arquivo `prisma.config.ts` para migrações.

## Rodando localmente

1. Instale dependências:

```bash
pnpm install
```

2. Configure variáveis de ambiente:

- `DATABASE_URL` para o cliente Prisma na aplicação.
- `DIRECT_URL` para as migrações do Prisma.

3. Execute em modo de desenvolvimento:

```bash
pnpm dev
```

4. Acesse `http://localhost:3000`.

## Estrutura atual

- `src/app/` - estrutura principal de páginas do Next.js.
- `src/lib/` - utilitários e inicialização do Prisma.
- `prisma/` - esquema do banco e migrações.
- `src/components/shared/` - componente UI compartilhado (scaffold).

## Próximos passos

- Adicionar endpoints API reais em `src/app/api`.
- Criar modelos e hooks de front-end para timesheets e registro de ponto.
- Implementar autenticação e autorização.
- Construir dashboards e relatórios de horas.
