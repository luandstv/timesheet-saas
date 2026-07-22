# Jornix Timesheet SaaS

Aplicação para controle de ponto e gestão de timesheets com autenticação, dashboard e registros diários.

## Stack atual

- Next.js 16 (App Router)
- React 19
- Tailwind CSS
- Prisma + PostgreSQL
- Supabase Auth
- Luxon para timezone e cálculos de horários

## Funcionalidades implementadas

- Autenticação com login e cadastro de usuários
- Rotas autenticadas para dashboard e registro de ponto
- Tela de ponto com fluxo de clock-in/clock-out
- Listagem dos registros do dia
- Cálculo de jornada trabalhada e horas extras (75% e 100%)
- Resumos diários, semanais e mensais no dashboard
- Estrutura modular com serviços para dashboard, entradas e cálculos

## Estrutura relevante

- App Router: `src/app/`
- Componentes compartilhados: `src/components/shared/`
- UI primitives: `src/components/ui/`
- Serviços e regras de negócio: `src/services/`
- Schema Prisma: `prisma/schema.prisma`

## Como rodar localmente

1. Instale as dependências:

```bash
pnpm install
```

2. Configure as variáveis de ambiente em um arquivo `.env`:

```env
DATABASE_URL=your_postgres_connection_string
DIRECT_URL=your_direct_postgres_connection_string
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Aplique as migrações do banco:

```bash
pnpm prisma migrate dev
```

4. Inicie o projeto:

```bash
pnpm dev
```

5. Acesse `http://localhost:3000`.

## Observações

- As migrações ficam em `prisma/migrations`.
- O cliente Prisma gerado está em `generated/prisma`.
- O fuso horário utilizado no fluxo de ponto é configurado via `src/lib/constants.ts`.

## Próximos passos

- Expandir regras de cálculo e validações de jornada
- Implementar permissões por perfil (admin/manager/collaborator)
- Adicionar testes e CI/CD
- Evoluir a API interna para mais operações de timesheet e ausência
