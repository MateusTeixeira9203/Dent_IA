export interface Clinica {
  id: string;
  nome: string;
  created_at: string;
  updated_at: string;
}

export interface Dentista {
  id: string;
  clinica_id: string;
  user_id: string;
  nome: string;
  cro: string | null;
  especialidade: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Paciente {
  id: string;
  clinica_id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  whatsapp: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ficha {
  id: string;
  clinica_id: string;
  paciente_id: string;
  dentista_id: string;
  audio_url: string | null;
  transcricao: string | null;
  foto_ficha_url: string | null;
  radiografia_url: string | null;
  anotacoes: string | null;
  status: "aberta" | "concluida";
  created_at: string;
  updated_at: string;
}

export interface Procedimento {
  id: string;
  clinica_id: string;
  nome: string;
  descricao: string | null;
  codigo_tuss: string | null;
  preco_padrao: number | null;
  duracao_minutos: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Orcamento {
  id: string;
  clinica_id: string;
  ficha_id: string;
  paciente_id: string;
  dentista_id: string;
  status: "rascunho" | "enviado" | "aprovado" | "recusado";
  validade_dias: number;
  condicoes_pagamento: string | null;
  total: number | null;
  pdf_url: string | null;
  enviado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcedimentoPadrao {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  preco_sugerido: number;
  duracao_minutos: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FichaArquivo {
  id: string;
  clinica_id: string;
  ficha_id: string;
  tipo: "documento" | "foto_ficha" | "radiografia";
  nome_original: string;
  storage_url: string;
  texto_extraido: string | null;
  processado: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrcamentoItem {
  id: string;
  clinica_id: string;
  orcamento_id: string;
  procedimento_id: string | null;
  descricao: string | null;
  dente: string | null;
  quantidade: number;
  preco_unitario: number | null;
  preco_total: number | null;
  created_at: string;
  updated_at: string;
}
