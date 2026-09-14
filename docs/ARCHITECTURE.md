# Arquitetura do Jornix

## Visão geral

O projeto usa Next.js App Router. As páginas autenticadas carregam o usuário
no servidor, consultam os serviços de domínio e passam dados serializáveis para
componentes de interface. A autenticação é feita pelo Supabase e os dados de
jornada são persistidos em PostgreSQL através do Prisma.

```text
Browser
  │
  ├─ Server Components / Server Actions
  │      ├─ lib/auth.ts
  │      ├─ services/*
  │      └─ Prisma → PostgreSQL
  │
  └─ Client Components
         ├─ formulários
         ├─ relógio ao vivo
         └─ navegação e tema
```

## Responsabilidades

### `src/app`

Contém as rotas, páginas e ações de servidor. As páginas devem orquestrar
autenticação, carregamento e composição da tela; regras de cálculo e consultas
reutilizáveis ficam nos serviços.

### `src/services`

Concentra regras de negócio:

- `time-entry.service.ts`: cria o timesheet do dia e alterna entrada/saída.
- `time-calculation.service.ts`: forma pares e calcula horas normais e extras.
- `dashboard.service.ts`: resumos diário, semanal e mensal.
- `report.service.ts`: filtros, linhas e totais dos relatórios.

O cálculo do timesheet é atualizado quando uma saída é registrada, pois nesse
momento existe um par completo de entrada e saída.

### `src/lib`

Reúne infraestrutura e funções puras compartilhadas. `date-only.ts` trata
datas civis armazenadas em colunas PostgreSQL `DATE`; `format.ts` formata
durações; `auth.ts` carrega o usuário autenticado.

### `src/schemas`

Define as validações de login, cadastro, jornada, salário e filtros de
relatório com Zod. Server Actions devem validar os dados antes de persistir.

### `src/components`

`components/ui` contém primitivos visuais. `components/shared` contém
componentes compostos usados por mais de uma rota, como navegação, cards,
relógio e lista de registros.

## Fluxo do registro de ponto

1. O usuário aciona o botão de entrada/saída.
2. A Server Action autentica o usuário.
3. `TimeEntryService` encontra ou cria o timesheet do dia em
   `America/Sao_Paulo`.
4. A entrada é persistida como `CLOCK_IN` ou `CLOCK_OUT`.
5. Ao registrar uma saída, `TimeCalculationService` recalcula o timesheet.
6. As rotas de ponto e dashboard são revalidadas.

## Fluxo dos relatórios

1. A página valida `startDate` e `endDate` com `reportQuerySchema`.
2. `report.service.ts` consulta o intervalo no banco.
3. Datas civis são convertidas por `date-only.ts` para não sofrerem deslocamento
   pelo fuso do servidor.
4. O serviço devolve linhas e resumo para os componentes de filtro, resumo e
   tabela.

## Decisões de data

O usuário sempre trabalha com o fuso `America/Sao_Paulo`. O banco usa `DATE`
para o dia do timesheet e `DateTime` para os timestamps dos registros. A
normalização UTC é uma técnica de consulta/persistência para o tipo `DATE`, não
uma mudança do fuso exibido na aplicação.
