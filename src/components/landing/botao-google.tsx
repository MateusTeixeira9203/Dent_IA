'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { GoogleIcone } from './icones';

/**
 * Mesma chamada do cadastro-form: quem vem da landing está entrando pra testar,
 * então cai no onboarding, não no dashboard.
 */
export function BotaoGoogle() {
  const [indo, setIndo] = useState(false);

  const entrar = async (): Promise<void> => {
    setIndo(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    if (error) {
      toast.error('Erro ao iniciar cadastro com Google. Tente novamente.');
      setIndo(false);
    }
  };

  return (
    <button type="button" className="btn btn-google" onClick={entrar} disabled={indo}>
      <GoogleIcone />
      Entrar com Google
    </button>
  );
}
