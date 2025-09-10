// Script para criar as tabelas diretamente no Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDMzMzUsImV4cCI6MjA3MTM3OTMzNX0.yYNiRdi0Ve9fzdAHGYsIi1iQf4Lredve3PMbRjw41BI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('🚀 Criando tabelas de projeção no Supabase...');
    
    // SQL para criar as tabelas
    const createTablesSQL = `
-- CITY GOALS TABLE
CREATE TABLE IF NOT EXISTS public.city_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  state text NOT NULL,
  goal_total integer NOT NULL CHECK (goal_total > 0),
  deadline date,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(city, state)
);

-- NEIGHBORHOOD GOALS TABLE
CREATE TABLE IF NOT EXISTS public.neighborhood_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  state text NOT NULL,
  neighborhood text NOT NULL,
  goal_total integer NOT NULL CHECK (goal_total > 0),
  city_goal_id uuid REFERENCES public.city_goals(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(city, state, neighborhood)
);

-- LEADER AREAS TABLE
CREATE TABLE IF NOT EXISTS public.leader_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  city text NOT NULL,
  state text NOT NULL,
  neighborhood text,
  target integer CHECK (target > 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(leader_id, city, state, neighborhood)
);

-- Enable RLS
ALTER TABLE public.city_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhood_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leader_areas ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS city_goals_city_state_idx ON public.city_goals(city, state);
CREATE INDEX IF NOT EXISTS neighborhood_goals_city_idx ON public.neighborhood_goals(city);
CREATE INDEX IF NOT EXISTS neighborhood_goals_city_state_idx ON public.neighborhood_goals(city, state);
CREATE INDEX IF NOT EXISTS leader_areas_leader_idx ON public.leader_areas(leader_id);
CREATE INDEX IF NOT EXISTS leader_areas_city_state_idx ON public.leader_areas(city, state);

-- Create updated_at triggers
DROP TRIGGER IF EXISTS update_city_goals_updated_at ON public.city_goals;
CREATE TRIGGER update_city_goals_updated_at
  BEFORE UPDATE ON public.city_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_neighborhood_goals_updated_at ON public.neighborhood_goals;
CREATE TRIGGER update_neighborhood_goals_updated_at
  BEFORE UPDATE ON public.neighborhood_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_leader_areas_updated_at ON public.leader_areas;
CREATE TRIGGER update_leader_areas_updated_at
  BEFORE UPDATE ON public.leader_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS POLICIES - ADMIN ONLY ACCESS

-- city_goals policies
DROP POLICY IF EXISTS "city_goals_admin_only" ON public.city_goals;
CREATE POLICY "city_goals_admin_only"
  ON public.city_goals
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- neighborhood_goals policies
DROP POLICY IF EXISTS "neighborhood_goals_admin_only" ON public.neighborhood_goals;
CREATE POLICY "neighborhood_goals_admin_only"
  ON public.neighborhood_goals
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- leader_areas policies
DROP POLICY IF EXISTS "leader_areas_admin_only" ON public.leader_areas;
CREATE POLICY "leader_areas_admin_only"
  ON public.leader_areas
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- CREATE VIEWS FOR AGGREGATED DATA

-- View: Votes by City
CREATE OR REPLACE VIEW public.vw_votes_by_city AS
SELECT 
  p.city,
  p.state,
  COUNT(*) as total_people,
  COUNT(CASE WHEN p.vote_status = 'CONFIRMADO' THEN 1 END) as confirmed,
  COUNT(CASE WHEN p.vote_status = 'PROVAVEL' THEN 1 END) as probable,
  COUNT(CASE WHEN p.vote_status = 'INDEFINIDO' THEN 1 END) as undefined
FROM public.people p
WHERE p.city IS NOT NULL AND p.state IS NOT NULL
GROUP BY p.city, p.state
ORDER BY p.city, p.state;

-- View: Votes by Neighborhood
CREATE OR REPLACE VIEW public.vw_votes_by_neighborhood AS
SELECT 
  p.city,
  p.state,
  p.neighborhood,
  COUNT(*) as total_people,
  COUNT(CASE WHEN p.vote_status = 'CONFIRMADO' THEN 1 END) as confirmed,
  COUNT(CASE WHEN p.vote_status = 'PROVAVEL' THEN 1 END) as probable,
  COUNT(CASE WHEN p.vote_status = 'INDEFINIDO' THEN 1 END) as undefined
FROM public.people p
WHERE p.city IS NOT NULL AND p.state IS NOT NULL AND p.neighborhood IS NOT NULL
GROUP BY p.city, p.state, p.neighborhood
ORDER BY p.city, p.neighborhood;

-- Grant permissions on views
GRANT SELECT ON public.vw_votes_by_city TO authenticated;
GRANT SELECT ON public.vw_votes_by_neighborhood TO authenticated;
    `;
    
    // Executar o SQL usando uma função RPC personalizada
    console.log('📝 Executando SQL de criação das tabelas...');
    
    // Como não temos uma função RPC personalizada, vamos tentar uma abordagem diferente
    // Vamos usar o método rpc com uma função que pode não existir, mas vamos capturar o erro
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
    
    if (error) {
      console.log('⚠️ Função RPC não disponível. Vou tentar uma abordagem alternativa...');
      
      // Tentar criar as tabelas uma por uma usando operações diretas
      console.log('🔧 Tentando criar tabelas individualmente...');
      
      // Verificar se as tabelas já existem
      const { data: existingTables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['city_goals', 'neighborhood_goals', 'leader_areas']);
      
      if (tableError) {
        console.error('❌ Erro ao verificar tabelas existentes:', tableError);
        return;
      }
      
      const existingTableNames = existingTables?.map(t => t.table_name) || [];
      console.log('📋 Tabelas existentes:', existingTableNames);
      
      if (existingTableNames.includes('city_goals')) {
        console.log('✅ Tabela city_goals já existe');
      } else {
        console.log('❌ Tabela city_goals não existe - precisa ser criada manualmente');
      }
      
      if (existingTableNames.includes('neighborhood_goals')) {
        console.log('✅ Tabela neighborhood_goals já existe');
      } else {
        console.log('❌ Tabela neighborhood_goals não existe - precisa ser criada manualmente');
      }
      
      if (existingTableNames.includes('leader_areas')) {
        console.log('✅ Tabela leader_areas já existe');
      } else {
        console.log('❌ Tabela leader_areas não existe - precisa ser criada manualmente');
      }
      
      console.log('\n📝 Para criar as tabelas manualmente:');
      console.log('1. Acesse: https://supabase.com/dashboard/project/ojxwwjurwhwtoydywvch/sql');
      console.log('2. Cole e execute o SQL do arquivo: supabase/migrations/20250115_create_projection_tables.sql');
      console.log('3. Ou execute o SQL que está no console acima');
      
    } else {
      console.log('✅ Tabelas criadas com sucesso!');
      console.log('📊 Tabelas criadas:');
      console.log('   - city_goals');
      console.log('   - neighborhood_goals');
      console.log('   - leader_areas');
      console.log('   - vw_votes_by_city (view)');
      console.log('   - vw_votes_by_neighborhood (view)');
    }
    
  } catch (err) {
    console.error('❌ Erro:', err);
    console.log('\n📝 Para criar as tabelas manualmente:');
    console.log('1. Acesse: https://supabase.com/dashboard/project/ojxwwjurwhwtoydywvch/sql');
    console.log('2. Cole e execute o SQL do arquivo: supabase/migrations/20250115_create_projection_tables.sql');
  }
}

createTables();






















