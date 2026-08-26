# Design brief — R-97 Gestão da clínica

> **Status:** proposta para artefato · **Rota:** `/dashboard/configuracoes?aba=clinica`
> **Tipo:** tela de produto B2B clínica · **Referências:** Dashboard, Tratamento e tokens atuais

## Direção

O painel deve parecer uma central operacional compartilhada, não uma página administrativa.
Precisa transmitir igualdade entre sócios, clareza de responsabilidades e ausência de acesso aos
dados privados dos colegas. O vocabulário visual é herdado do produto; não se cria um novo tema.

## Paleta e tokens

Usar somente os tokens existentes:

- fundo: `bg-background` / `bg-bg`;
- superfície: `bg-card` / `bg-surface`;
- superfície secundária: `bg-muted` / `bg-surface-alt`;
- texto: `text-foreground`, `text-text-primary`, `text-muted-foreground`;
- borda: `border-border`;
- ação/estado positivo: teal canônico (`text-teal`, `bg-teal-pale`);
- alerta de prazo: warning canônico;
- destrutivo apenas em saída própria/remoção permitida.

Dark e light são equivalentes funcionais. Sem cores hardcoded, gradiente roxo, glass excessivo ou
background decorativo próprio da seção.

## Tipografia

- títulos: DM Serif Display via `font-heading`;
- corpo e controles: Outfit via `font-sans`;
- rótulos técnicos, contadores e prazos: DM Mono via `font-mono`.

Hierarquia: título 28–32 px; título de seção 18–22 px; corpo 14–16 px; metadado nunca abaixo de
12 px. Texto curto e operacional.

## Layout desktop

1. Navegação lateral existente de Configurações.
2. Cabeçalho da aba com “Clínica”, nome e descrição de uma linha.
3. Faixa-resumo compacta: dentistas ativos, convites pendentes e capacidade 2–8.
4. Grid principal 7/5:
   - coluna larga: Dados da clínica e Equipe;
   - coluna estreita: Convites e WhatsApp Em breve.
5. “Sair da clínica” no fim, visualmente separado e sem destaque competitivo com ações normais.

Equipe é a informação dominante. Dados da clínica não deve ocupar a primeira dobra inteira.
Convite novo fica visível sem modal escondido atrás de menus profundos.

## Layout mobile

Uma coluna na ordem: resumo → convite rápido → equipe → dados recolhíveis → WhatsApp → saída.
Botões com alvo mínimo de 44 px; nenhum scroll horizontal. O formulário de dados inicia recolhido
quando já está completo, reduzindo rolagem no uso diário.

## Componentes

- cards com `rounded-2xl`, borda de 1 px e sombra mínima;
- avatar/logo funcional, sem ícone decorativo em círculo para toda seção;
- membro em linha: identidade à esquerda, função/estado no centro, ação permitida à direita;
- dentista não tem menu de remoção;
- convite pendente usa prazo legível e ações secundárias discretas;
- WhatsApp Em breve é uma faixa informativa, não um CTA desabilitado que pareça quebrado;
- formação R-92, quando habilitada, usa progressão textual `1 de 2 cartões prontos` e prazo real.

## Motion

Motion sentida, não percebida: entrada de seção 160–220 ms; expansão de formulário 180 ms;
feedback de copiar convite imediato. Respeitar `prefers-reduced-motion`. Sem animação contínua.

## Estados obrigatórios

Loading independente por seção; equipe vazia; convite enviado; e-mail falhou com link copiável;
convite expirado; limite atingido; erro de permissão; salvamento de dados; modo sem billing; modo de
formação futura; recomposição em 48h; decisão Consultório × Clínica bloqueada. Erro de uma seção
não apaga as outras.

## Travas visuais

- não reintroduzir “Admin”, “dono” ou hierarquia entre dentistas;
- não misturar Plano/cobrança individual dentro da lista da equipe;
- decisão após perda do mínimo usa duas ações equivalentes e explica o efeito antes de confirmar;
- não mostrar WhatsApp funcional antes da atualização correspondente;
- não inventar novos destinos: toda ação deve apontar para action/rota mapeada na spec;
- deve parecer feita pela mesma equipe do Dashboard, Meu Dia e Ficha clínica.
