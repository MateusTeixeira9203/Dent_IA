# PWA: abertura em Android e iOS

Pesquisa em 27/08/2026 para a abertura do Odonto.IA instalado.

## Fatos verificados

- Em Android 12+, a splash inicial é uma janela do sistema. A entrada é controlada pelo Android; o app nativo pode configurar ícone, cor e, quando possui camada Android, animação do ícone. Uma PWA/WebAPK não controla essa janela com HTML, CSS ou JavaScript.
  Fonte: https://developer.android.com/develop/ui/views/launch/splash-screen
- Em PWAs, `background_color` do manifest é temporário e contribui para a splash em alguns navegadores/sistemas. Deve coincidir com o fundo CSS para não haver corte visual.
  Fonte: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/background_color
- Em iOS, um web app adicionado à Tela de Início em modo standalone é executado sem a UI do navegador. A Apple documenta uma imagem de lançamento estática (`apple-touch-startup-image`) e a detecção via `navigator.standalone`.
  Fonte: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
- `useEffect` não bloqueia a primeira pintura; `useLayoutEffect` é processado antes da repintura do navegador. Ambos só existem no cliente, depois de o sistema liberar o conteúdo web.
  Fonte: https://react.dev/reference/react/useLayoutEffect

## Implicação para o produto

Não existe animação contínua do ícone nativo para o DOM de uma PWA. A abertura premium precisa ser composta em duas etapas visualmente idênticas:

1. splash estática do sistema (ícone e fundo do manifest);
2. primeira tela da web reproduz o mesmo ícone/fundo e então anima para a marca antes de mostrar o dashboard.

O conteúdo da aplicação deve ficar bloqueado durante a etapa 2. Montar uma sobreposição após os filhos já renderizados, acionada com `useEffect`, deixa a transição disputar a primeira pintura e pode fazê-la parecer um flash ou não aparecer.
