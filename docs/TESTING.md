# Estratégia de testes

## Comando atual

```bash
pnpm test
```

Os testes usam recursos de strip de tipos introduzidos no Node.js 22.6. O
servidor da aplicação continua compatível com Node.js 20.9 ou superior.

O projeto usa o `node:test`, runner nativo e estável do Node.js. Um loader
pequeno em `tests/loader.mjs` permite que os testes executem módulos TypeScript
com os imports relativos usados pelas regras de domínio, sem adicionar outra
dependência de transformação.

## Cobertura atual

Os testes em `tests/` cobrem 14 cenários:

- normalização de datas civis no fuso brasileiro;
- intervalos inclusivos para colunas SQL `DATE`;
- cálculo dos 50 minutos de uma entrada e saída;
- limite de hora extra de 75% e excedente de 100%;
- trabalho em fim de semana;
- entrada sem saída correspondente;
- formatação longa e compacta de duração;
- parâmetros repetidos e intervalos inválidos nos relatórios;
- validação de login e confirmação de senha.

Os testes são unitários e não acessam PostgreSQL, Supabase ou o navegador.
Isso mantém a execução rápida e determinística.

## Verificações complementares

```bash
node node_modules/typescript/bin/tsc --noEmit
pnpm lint
git diff --check
```

O lint pode emitir um aviso do TanStack Table sobre a compatibilidade de
`useReactTable` com o React Compiler. Esse aviso não impede a execução.

## Próxima camada

Para aumentar a confiança da aplicação, os próximos testes devem cobrir:

- componentes de formulário com React Testing Library;
- fluxo de atualização de configurações;
- integração das Server Actions com Prisma usando banco de teste;
- fluxos E2E com Playwright para login, entrada, saída e relatórios.

Server Components assíncronos devem ser verificados preferencialmente por
testes E2E, pois não são totalmente suportados pelos runners de unidade.
