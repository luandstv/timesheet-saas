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

- `time-entry.service.ts`: consulta o último movimento do usuário, alterna
  entrada/saída e mantém o par na jornada de origem mesmo após meia-noite.
- `time-calculation.service.ts`: forma pares e calcula horas normais e extras.
- `dashboard.service.ts`: resumos diário, semanal e mensal.
- `report.service.ts`: filtros, linhas e totais dos relatórios.

O cálculo do timesheet é atualizado quando uma saída é registrada, pois nesse
momento existe um par completo de entrada e saída.

O registro é executado dentro de uma transação que bloqueia a linha do usuário
durante a decisão e a gravação. Cada chamada da interface carrega um
`requestId` único, salvo em `time_entries`; repetir a mesma chamada devolve o
registro original. Essa proteção contra duplicidade não limita a quantidade de
pares legítimos no dia: cada acionamento de sobreaviso usa uma nova chave.

Em dias úteis, a apuração considera primeiro a carga diária configurada como
horas normais. Das horas excedentes, as primeiras 2 horas (120 minutos) são
classificadas como extra de 75%; todo o restante é classificado como extra de
100%. Esse limite é único por jornada e compartilhado entre intervalos e faixas
FHC/FHCN. Em fins de semana e feriados, todo o tempo trabalhado é classificado
como extra de 100%.

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
3. `TimeEntryService.getClockState` consulta o último movimento do usuário,
   independentemente do dia. Uma entrada aberta exige uma saída na mesma folha;
   quando não há entrada aberta, o serviço encontra ou cria a folha de hoje.
4. O movimento é persistido como `CLOCK_IN` ou `CLOCK_OUT`, com o horário atual.
   Folhas com status diferente de `OPEN` rejeitam novos movimentos.
5. Ao registrar uma saída, `TimeCalculationService` recalcula o timesheet.
6. As rotas de ponto, dashboard e relatórios são revalidadas.

O botão controla o envio com um estado local encerrado em `finally` e bloqueia
cliques repetidos enquanto a solicitação está em curso. A interface recebe os
dados atualizados pela própria Server Action; não dispara `router.refresh()`
adicional após a gravação. Se a resposta falhar, orienta conferir os registros
antes de repetir, pois o servidor pode já ter persistido o movimento.

`getTodayMovements` consulta os timestamps entre o início de hoje e o início
de amanhã em `America/Sao_Paulo`, incluindo uma saída de hoje que encerra a
folha de ontem. O estado do botão não depende dessa lista. A apresentação
compartilhada em `clock-presentation.ts` exibe a data e o aviso de pendência.

A apuração continua agrupada na data da entrada. Dividir adicionais entre dias
com regras diferentes, corrigir entradas antigas encobertas por movimentos
posteriores e impedir requisições concorrentes permanecem tarefas separadas.

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
