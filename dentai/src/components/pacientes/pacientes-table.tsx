"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, FileText, Eye, Search, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Paciente } from "@/types/database";

interface PacientesTableProps {
  pacientes: Paciente[];
}

export function PacientesTable({ pacientes }: PacientesTableProps) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [pacienteSelecionado, setPacienteSelecionado] =
    useState<Paciente | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);

  // Filtro por nome ou CPF em tempo real
  const pacientesFiltrados = pacientes.filter((p) => {
    const termo = busca.toLowerCase();
    return (
      p.nome.toLowerCase().includes(termo) ||
      (p.cpf ?? "").toLowerCase().includes(termo)
    );
  });

  function abrirDialogNovaFicha(paciente: Paciente) {
    setPacienteSelecionado(paciente);
    setDialogAberto(true);
  }

  function confirmarNovaFicha() {
    if (!pacienteSelecionado) return;
    setDialogAberto(false);
    router.push(
      `/dashboard/fichas/nova?paciente_id=${pacienteSelecionado.id}`
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por nome ou CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pacientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Users className="size-8" />
                    {busca
                      ? "Nenhum paciente encontrado para essa busca"
                      : "Nenhum paciente cadastrado ainda"}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pacientesFiltrados.map((paciente) => (
                <TableRow key={paciente.id}>
                  <TableCell className="font-medium text-slate-900">
                    {paciente.nome}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {paciente.cpf ?? "—"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {paciente.telefone ?? "—"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {paciente.whatsapp ?? "—"}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {paciente.cidade && paciente.estado
                      ? `${paciente.cidade} / ${paciente.estado}`
                      : paciente.cidade ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Botão Nova Ficha */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirDialogNovaFicha(paciente)}
                      >
                        <FileText className="size-3.5" />
                        Nova Ficha
                      </Button>
                      {/* Botão Ver Paciente */}
                      <Link href={`/dashboard/pacientes/${paciente.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="size-3.5" />
                          Ver
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de confirmação Nova Ficha */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Ficha</DialogTitle>
            <DialogDescription>
              Criar uma nova ficha para{" "}
              <strong>{pacienteSelecionado?.nome}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={confirmarNovaFicha}>Criar Ficha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
