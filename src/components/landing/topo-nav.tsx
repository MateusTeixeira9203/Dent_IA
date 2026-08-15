'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const SECOES = [
  { href: '#problema', rotulo: 'O problema' },
  { href: '#como', rotulo: 'Como funciona' },
  { href: '#quem', rotulo: 'Quem usa' },
  { href: '#preco', rotulo: 'Preço' },
];

/** Nav quase transparente no início; ao rolar, ganha opacidade e o fio inferior. */
export function TopoNav() {
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  return (
    <nav className={cn('topo', rolou && 'rolou')}>
      <div className="env">
        <span className="marca">
          Odonto<i>.IA</i>
        </span>
        <div className="menu">
          {SECOES.map((s) => (
            <a key={s.href} href={s.href}>
              {s.rotulo}
            </a>
          ))}
        </div>
        <div className="topo-dir">
          <Link href="/login" className="entrar">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn btn-p btn-compacto">
            Testar 14 dias
          </Link>
        </div>
      </div>
    </nav>
  );
}
