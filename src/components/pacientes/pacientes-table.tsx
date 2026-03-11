"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Search, FileText, Eye } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/dentai";
import type { Paciente } from "@/types/database";

interface PacientesTableProps {
  pacientes: Paciente[];
}

export function PacientesTable({ pacientes }: PacientesTableProps): React.JSX.Element {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);

  // Filtro por nome ou CPF em tempo real
  const pacientesFiltrados = pacientes.filter((p) => {
    const termo = busca.toLowerCase();
    return (
      p.nome.toLowerCase().includes(termo) ||
      (p.cpf ?? "").toLowerCase().includes(termo)
    );
  });

  function abrirDialogNovaFicha(paciente: Paciente): void {
    setPacienteSelecionado(paciente);
    setDialogAberto(true);
  }

  function confirmarNovaFicha(): void {
    if (!pacienteSelecionado) return;
    setDialogAberto(false);
    router.push(`/dashboard/fichas/nova?paciente_id=${pacienteSelecionado.id}`);
  }

  return (
    <div className="space-y-4">
      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-muted pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar por nome ou CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full font-sans text-sm pl-9 pr-4 py-2.5 rounded-[3px] border border-brand-border bg-brand-bg text-brand-black placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
        />
      </div>

      {/* Tabela */}
      <div className="rounded border border-brand-border bg-white overflow-hidden shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-brand-bg border-brand-border hover:bg-brand-bg">
              <TableHead className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-brand-muted">Nome</TableHead>
              <TableHead className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-brand-muted">CPF</TableHead>
              <TableHead className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-brand-muted">Telefone</TableHead>
              <TableHead className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-brand-muted">WhatsApp</TableHead>
              <TableHead className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-brand-muted">Cidade</TableHead>
              <TableHead className="text-right font-mono text-[0.65rem] uppercase tracking-[0.15em] text-brand-muted">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pacientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-44 text-center border-0">
                  <div className="flex flex-col items-center gap-3 text-brand-muted">
                    <Users className="size-10 opacity-40" />
                    <p className="font-sans text-sm">
                      {busca
                        ? "Nenhum paciente encontrado para essa busca"
                        : "Nenhum paciente cadastrado ainda"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pacientesFiltrados.map((paciente) => (
                <TableRow key={paciente.id} className="border-brand-border hover:bg-brand-bg/40">
                  <TableCell className="font-sans font-medium text-brand-black">
                    {paciente.nome}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-brand-muted">
                    {paciente.cpf ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-brand-muted">
                    {paciente.telefone ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-brand-muted">
                    {paciente.whatsapp ?? "—"}
                  </TableCell>
                  <TableCell className="font-sans text-sm text-brand-muted">
                    {paciente.cidade && paciente.estado
                      ? `${paciente.cidade} / ${paciente.estado}`
                      : (paciente.cidade ?? "—")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirDialogNovaFicha(paciente)}
                      >
                        <FileText className="size-3.5" />
                        Nova Ficha
                      </Button>
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
            <DialogTitle className="font-serif">Nova Ficha</DialogTitle>
            <DialogDescription>
              Criar uma nova ficha para{" "}
              <strong>{pacienteSelecionado?.nome}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={confirmarNovaFicha}>
              Criar Ficha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
