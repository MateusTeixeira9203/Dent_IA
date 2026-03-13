"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClinicaForm } from "./clinica-form";
import { HorariosForm } from "./horarios-form";
import { ProcedimentosForm } from "./procedimentos-form";
import type {
  ConfiguracaoClinica,
  HorarioDisponivel,
  ProcedimentoPadrao,
} from "@/types/database";

interface Props {
  configuracao: ConfiguracaoClinica | null;
  horarios: HorarioDisponivel[];
  procedimentos: ProcedimentoPadrao[];
}

export function ConfigTabs({
  configuracao,
  horarios,
  procedimentos,
}: Props): React.JSX.Element {
  return (
    <Tabs defaultValue="clinica">
      <TabsList className="mb-6">
        <TabsTrigger value="clinica">Clínica</TabsTrigger>
        <TabsTrigger value="horarios">Horários</TabsTrigger>
        <TabsTrigger value="procedimentos">Procedimentos</TabsTrigger>
      </TabsList>

      <TabsContent value="clinica">
        <ClinicaForm configuracao={configuracao} />
      </TabsContent>

      <TabsContent value="horarios">
        <HorariosForm horarios={horarios} />
      </TabsContent>

      <TabsContent value="procedimentos">
        <ProcedimentosForm procedimentos={procedimentos} />
      </TabsContent>
    </Tabs>
  );
}
