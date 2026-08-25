import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;

function subscribe(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
}

function getServerSnapshot() {
  // O primeiro HTML do servidor e da hidratação precisa ser o mesmo. React atualiza
  // para o viewport real depois de montar, sem depender de um setState de efeito.
  return false;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
