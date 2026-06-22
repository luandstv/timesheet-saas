# Changelog

Todas as mudanças notáveis neste repositório.

## [Unreleased] - 2026-06-22

- Inicializa base do Timesheet SaaS:
  - Next.js 16 (app router), Tailwind CSS e Prisma
  - Configuração de workspace pnpm
- Adiciona esquema Prisma (`prisma/schema.prisma`) com modelos: User, Timesheet, TimeEntry, TimeEntryAdjustment, Activity, onCallSchedule, UserSalaryConfig, Holiday, Absences
- Configura cliente Prisma em `src/lib/prisma.ts` usando `@prisma/adapter-pg`
- Adiciona `prisma.config.ts` e migrações iniciais em `prisma/migrations`
- Implementa layout base e página inicial (`src/app/layout.tsx`, `src/app/page.tsx`)
- Cria scaffolds e componentes iniciais (`src/app/api/`, `src/components/shared/`, `src/components/ui/`, `src/hooks/`, `src/schemas/`, `src/services/`, `src/types/`)
- Atualiza README com resumo do estado do projeto e instruções de execução
- Remove alguns arquivos de scaffold obsoletos (.gitkeep) e adiciona novos arquivos de componente

## Próximos passos (planejados)

- Implementar endpoints API para timesheets, lançamentos e ausências
- Autenticação e autorização (roles: ADMIN, MANAGER, COLLABORATOR)
- Componentes e hooks do front-end para registro de ponto
- Testes automatizados e CI/CD

---

> Gerado automaticamente conforme estado atual do repositório. Atualize este arquivo ao criar releases ou mudanças significativas.
