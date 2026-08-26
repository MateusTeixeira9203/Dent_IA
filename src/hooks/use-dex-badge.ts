'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Contador leve do dock. Não carrega contexto, retenção ou alertas computados: esses dados
 * pertencem ao painel e só são buscados quando o profissional abre o Dex.
 */
export function useDexBadge(enabled: boolean): number {
  const [count, setCount] = useState(0);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/dex/alerts?modo=badge');
      if (!resposta.ok) return;
      const dados = (await resposta.json()) as { count?: number };
      setCount(dados.count ?? 0);
    } catch {
      // O dock continua utilizável sem badge quando a rede falha.
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const inicial = window.setTimeout(() => { void carregar(); }, 0);

    const supabase = createClient();
    const channel = supabase
      .channel('dex-badge-notificacoes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, () => {
        void carregar();
      })
      .subscribe();

    window.addEventListener('dex-badge-refresh', carregar);
    return () => {
      window.clearTimeout(inicial);
      window.removeEventListener('dex-badge-refresh', carregar);
      void supabase.removeChannel(channel);
    };
  }, [carregar, enabled]);

  return enabled ? count : 0;
}
