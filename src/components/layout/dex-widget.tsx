'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'motion/react';
import { useDexHub } from '@/hooks/useDexHub';
import { DexHubModal } from './dex-hub/dex-hub-modal';

interface DexWidgetProps {
  nome: string;
}

export function DexWidget({ nome }: DexWidgetProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const hub = useDexHub();

  useEffect(() => setMounted(true), []);

  // Listener externo — a bola do dock abre/fecha via evento
  useEffect(() => {
    const handler = () => setIsOpen((prev) => !prev);
    window.addEventListener('dex-toggle', handler);
    return () => window.removeEventListener('dex-toggle', handler);
  }, []);

  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleNavigate = useCallback((href: string) => {
    setIsOpen(false);
    router.push(href);
  }, [router]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <DexHubModal
          nome={nome}
          loading={hub.loading}
          error={hub.error}
          pendencias={hub.pendencias}
          eventos={hub.eventos}
          agora={hub.agora}
          numeros={hub.numeros}
          onClose={handleClose}
          onRecarregar={hub.recarregar}
          onMarcarLida={hub.marcarLida}
          onNavigate={handleNavigate}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}
