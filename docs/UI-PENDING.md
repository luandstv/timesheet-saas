# Pendências da interface Jornix

Referência visual: dashboard grafite e âmbar fornecido pelo usuário.

## JORNIX-UI-01 — Sobreaviso

- [x] Implementar cadastro e consulta mensal dos dias de sobreaviso.
- [x] Substituir os mocks do dashboard e da página de Sobreaviso por dados reais.
- [x] Calcular a disponibilidade padrão por dia útil, fim de semana e feriado.
- [x] Permitir gestores consultar a escala dos colaboradores autorizados.
- [x] Exibir a prévia privada de remuneração com extras, sobreaviso e DSR.
- [ ] Implementar períodos parciais, virada de dia e recorrência de escalas.
- [ ] Validar a fórmula do DSR com a contabilidade.

Os valores da remuneração são uma estimativa pessoal e não substituem a folha oficial.

## JORNIX-UI-02 — Notificações

- [ ] Definir eventos, persistência e estado de leitura.
- [x] Integrar o painel de notificações do header com solicitações de ajuste pendentes.
- [ ] Adicionar notificações persistidas e estado de leitura.

O painel já mostra a quantidade real de solicitações pendentes que o usuário pode revisar.

## Elementos já ligados a dados reais

- Horário em America/Sao_Paulo e registro de entrada/saída.
- Resumos de hoje, semana e mês, utilizando os serviços existentes.
- Gráfico semanal e navegação de semanas, utilizando o serviço de relatórios.
- Busca de páginas, menu de conta, temas light/dark e navegação responsiva.

O total diário representa períodos apurados pelo serviço existente; não é um cronômetro de jornada aberta. O mapa e as montanhas são ilustrações SVG locais decorativas.
