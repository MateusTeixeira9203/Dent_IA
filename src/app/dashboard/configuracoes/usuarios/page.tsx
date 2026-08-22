import { redirect } from 'next/navigation';

/** R-97: equipe e convites agora vivem no painel unificado da clínica. */
export default function UsuariosPage(): never {
  redirect('/dashboard/configuracoes?aba=clinica');
}
