import { Suspense } from 'react';
import { CadastroForm } from './_components/cadastro-form';

// O plano não é mais escolhido aqui — ele é definido no onboarding, depois do aha.
export default function CadastroPage(): React.JSX.Element {
  return <Suspense fallback={<div className="min-h-screen" />}><CadastroForm /></Suspense>;
}
