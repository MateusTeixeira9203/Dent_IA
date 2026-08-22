'use client';

import { useEffect, useState } from 'react';
import { Check, Download, PlusSquare, Share } from 'lucide-react';

type InstallState =
  | 'checking'
  | 'available'
  | 'ios-instructions'
  | 'installed'
  | 'manual-instructions';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
}

function isIos() {
  return (
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  );
}

export function InstallPwaCard() {
  const [installState, setInstallState] = useState<InstallState>('checking');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    let promptReceived = false;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      promptReceived = true;
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallState('available');
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstallState('installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    const initialStateFrame = window.requestAnimationFrame(() => {
      if (promptReceived) return;
      setInstallState(
        isStandalone() ? 'installed' : isIos() ? 'ios-instructions' : 'manual-instructions',
      );
    });

    return () => {
      window.cancelAnimationFrame(initialStateFrame);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallState(choice.outcome === 'accepted' ? 'installed' : 'manual-instructions');
  };

  const installed = installState === 'installed';

  return (
    <div className="pwa-slot">
      <div className="pwa-slot__copy">
        <span className="pwa-slot__status">
          {installed ? <Check aria-hidden="true" /> : <Download aria-hidden="true" />}
          {installed ? 'Instalado' : 'Aplicativo instalável'}
        </span>
        <h2>{installed ? 'Odonto.IA na sua tela inicial.' : 'Leve o Odonto.IA para a tela inicial.'}</h2>
        <p className="intro">
          {installed
            ? 'Abra pelo ícone para entrar no sistema com a mesma conta e os mesmos dados.'
            : 'Acesse com um toque e use em tela cheia, sem procurar o endereço no navegador.'}
        </p>

        {showIosSteps && installState === 'ios-instructions' ? (
          <ol className="pwa-slot__steps" aria-label="Como instalar no iPhone">
            <li><Share aria-hidden="true" /> Toque em <strong>Compartilhar</strong> no Safari.</li>
            <li><PlusSquare aria-hidden="true" /> Escolha <strong>Adicionar à Tela de Início</strong>.</li>
            <li><Check aria-hidden="true" /> Confirme em <strong>Adicionar</strong>.</li>
          </ol>
        ) : null}

        {installState === 'manual-instructions' ? (
          <p className="pwa-slot__hint">
            Abra o menu do navegador e escolha <strong>Instalar aplicativo</strong> ou{' '}
            <strong>Adicionar à tela inicial</strong>.
          </p>
        ) : null}
      </div>

      {!installed && installState !== 'checking' && installState !== 'manual-instructions' ? (
        <button
          type="button"
          className="btn btn-p pwa-slot__action"
          onClick={
            installState === 'available'
              ? () => void handleInstall()
              : installState === 'ios-instructions'
                ? () => setShowIosSteps((current) => !current)
                : undefined
          }
        >
          {installState === 'available'
            ? 'Instalar o Odonto.IA'
            : showIosSteps ? 'Ocultar instruções' : 'Ver como instalar'}
        </button>
      ) : null}
    </div>
  );
}
