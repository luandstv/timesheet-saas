# Pendências da interface Jornix

Referência visual: dashboard grafite e âmbar fornecido pelo usuário.

## JORNIX-UI-01 — Sobreaviso

- [ ] Implementar cadastro, consulta e cálculo dos períodos.
- [ ] Substituir os mocks de 0 dias no dashboard e na página de Sobreaviso.
- [ ] Remover os badges "Mock temporário · TODO" somente após integrar dados reais.
- [ ] Validar totais por usuário e por mês.

Os valores demonstrativos não entram nos totais reais de trabalho.

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
