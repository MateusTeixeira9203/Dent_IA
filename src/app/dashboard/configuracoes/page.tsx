import { Settings } from "lucide-react";

export default function ConfiguracoesPage(): React.JSX.Element {
  return (
    <div className="animate-fade-in">
      {/* Cabeçalho da página */}
      <div className="mb-8">
        <p className="font-mono text-sm text-muted-foreground">
          Gerencie sua conta e preferências
        </p>
      </div>

      {/* Seção: Perfil */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            Perfil
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="font-mono text-xl text-primary font-medium">
              DR
            </span>
          </div>
          <div>
            <p className="font-sans font-medium text-foreground">Dentista</p>
            <p className="font-mono text-sm text-muted-foreground mt-0.5">
              Em breve: edição de perfil
            </p>
          </div>
        </div>
      </div>

      {/* Estado de construção */}
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Settings className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <h3 className="font-serif text-lg text-foreground mb-1">Em construção</h3>
        <p className="font-sans text-sm text-muted-foreground text-center max-w-sm">
          As configurações avançadas estarão disponíveis em breve
        </p>
      </div>
    </div>
  );
}
