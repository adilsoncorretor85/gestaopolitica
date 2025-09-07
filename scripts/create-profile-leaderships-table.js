// Script para criar a tabela profile_leaderships no Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDMzMzUsImV4cCI6MjA3MTM3OTMzNX0.yYNiRdi0Ve9fzdAHGYsIi1iQf4Lredve3PMbRjw41BI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createProfileLeadershipsTable() {
  try {
    console.log('🚀 Criando tabela profile_leaderships no Supabase...');
    
    // SQL para criar a tabela profile_leaderships
    const createTableSQL = `
-- PROFILE LEADERSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.profile_leaderships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_code text NOT NULL,
  organization text,
  level integer,
  reach_scope text,
  reach_size integer,
  extra jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id) -- Garante apenas 1 registro por líder
);

-- Enable RLS
ALTER TABLE public.profile_leaderships ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS profile_leaderships_profile_id_idx ON public.profile_leaderships(profile_id);
CREATE INDEX IF NOT EXISTS profile_leaderships_role_code_idx ON public.profile_leaderships(role_code);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_profile_leaderships_updated_at ON public.profile_leaderships;
CREATE TRIGGER update_profile_leaderships_updated_at
  BEFORE UPDATE ON public.profile_leaderships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS POLICIES - ADMIN e o próprio líder podem acessar
DROP POLICY IF EXISTS "profile_leaderships_select_self_or_admin" ON public.profile_leaderships;
CREATE POLICY "profile_leaderships_select_self_or_admin"
  ON public.profile_leaderships
  FOR SELECT
  USING (
    profile_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "profile_leaderships_update_self_or_admin" ON public.profile_leaderships;
CREATE POLICY "profile_leaderships_update_self_or_admin"
  ON public.profile_leaderships
  FOR UPDATE
  USING (
    profile_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "profile_leaderships_insert_admin" ON public.profile_leaderships;
CREATE POLICY "profile_leaderships_insert_admin"
  ON public.profile_leaderships
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "profile_leaderships_delete_admin" ON public.profile_leaderships;
CREATE POLICY "profile_leaderships_delete_admin"
  ON public.profile_leaderships
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );
    `;
    
    console.log('📝 Executando SQL de criação da tabela...');
    
    // Como não temos uma função RPC personalizada, vamos tentar uma abordagem diferente
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.log('⚠️ Função RPC não disponível. Vou tentar uma abordagem alternativa...');
      
      // Tentar criar a tabela usando operações diretas
      console.log('🔧 Tentando criar tabela individualmente...');
      
      // Verificar se a tabela já existe
      const { data: existingTables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'profile_leaderships');
      
      if (tableError) {
        console.error('❌ Erro ao verificar tabelas existentes:', tableError);
        return;
      }
      
      if (existingTables && existingTables.length > 0) {
        console.log('✅ Tabela profile_leaderships já existe');
      } else {
        console.log('❌ Tabela profile_leaderships não existe - precisa ser criada manualmente');
      }
      
      console.log('\n📝 Para criar a tabela manualmente:');
      console.log('1. Acesse: https://supabase.com/dashboard/project/ojxwwjurwhwtoydywvch/sql');
      console.log('2. Cole e execute o SQL abaixo:');
      console.log('\n' + createTableSQL);
      
    } else {
      console.log('✅ Tabela profile_leaderships criada com sucesso!');
      console.log('📊 Tabela criada com:');
      console.log('   - Colunas: id, profile_id, role_code, organization, level, reach_scope, reach_size, extra, created_at, updated_at');
      console.log('   - Constraint UNIQUE em profile_id (1 registro por líder)');
      console.log('   - RLS habilitado com políticas para ADMIN e próprio líder');
      console.log('   - Triggers de updated_at');
    }
    
  } catch (err) {
    console.error('❌ Erro:', err);
    console.log('\n📝 Para criar a tabela manualmente:');
    console.log('1. Acesse: https://supabase.com/dashboard/project/ojxwwjurwhwtoydywvch/sql');
    console.log('2. Cole e execute o SQL do arquivo: scripts/create-profile-leaderships-table.js');
  }
}

createProfileLeadershipsTable();

