-- Criar tabela de agendamentos para doação de sangue
CREATE TABLE public.agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  matricula TEXT NOT NULL,
  telefone TEXT NOT NULL,
  horario TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_horario UNIQUE(horario)
);

-- Habilitar RLS
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública (para verificar horários disponíveis)
CREATE POLICY "Todos podem visualizar agendamentos"
ON public.agendamentos
FOR SELECT
USING (true);

-- Política para permitir inserção pública (para fazer agendamentos)
CREATE POLICY "Todos podem criar agendamentos"
ON public.agendamentos
FOR INSERT
WITH CHECK (true);

-- Adicionar índice para melhor performance na busca de horários
CREATE INDEX idx_agendamentos_horario ON public.agendamentos(horario);