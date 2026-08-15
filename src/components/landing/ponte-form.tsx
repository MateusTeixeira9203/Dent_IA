'use client';

import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/utils';

/**
 * A chamada transicional. Com cartão na entrada, este é o ÚNICO caminho de quem se
 * interessou e não vai assinar hoje.
 *
 * O envio da ficha ainda é manual: a rota avisa a equipe e a resposta sai de gente
 * (ver api/landing/ficha-exemplo/route.ts). O que NÃO acontece aqui é fingir sucesso —
 * se o registro falhar, a pessoa vê o erro e pode tentar de novo.
 */
export function PonteForm() {
  const [email, setEmail] = useState('');
  const [invalido, setInvalido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const enviar = async (ev: FormEvent<HTMLFormElement>): Promise<void> => {
    ev.preventDefault();
    if (!/.+@.+\..+/.test(email.trim())) {
      setInvalido(true);
      return;
    }
    setInvalido(false);
    setErro(null);
    setEnviando(true);

    try {
      const resp = await fetch('/api/landing/ficha-exemplo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!resp.ok) {
        const corpo: unknown = await resp.json().catch(() => null);
        const msg =
          corpo && typeof corpo === 'object' && 'error' in corpo && typeof corpo.error === 'string'
            ? corpo.error
            : 'Não conseguimos registrar seu pedido agora. Tente de novo em instantes.';
        setErro(msg);
        return;
      }
      setEnviado(true);
    } catch {
      setErro('Sem conexão com o servidor. Tente de novo em instantes.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="ponte">
      <div>
        <p className="ponte-tit">Ainda não quer pôr o cartão?</p>
        <p className="ponte-sub">
          Leve a ficha completa da Maria em PDF — a mesma que você acabou de ver se montar, do jeito que sai do
          sistema.
        </p>
      </div>
      {enviado ? (
        <p className="ponte-ok">Pronto — a ficha da Maria vai pro seu e-mail em instantes.</p>
      ) : (
        <form className="ponte-form" onSubmit={enviar} noValidate>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (invalido) setInvalido(false);
              if (erro) setErro(null);
            }}
            className={cn(invalido && 'invalido')}
            placeholder="seu@email.com"
            aria-label="Seu e-mail"
            aria-invalid={invalido}
            disabled={enviando}
            required
          />
          <button type="submit" className="btn btn-s" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Receber a ficha'}
          </button>
          {erro && (
            <p className="ponte-erro" role="alert">
              {erro}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
