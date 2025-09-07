// Script para criar as tabelas de projeção no Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDMzMzUsImV4cCI6MjA3MTM3OTMzNX0.yYNiRdi0Ve9fzdAHGYsIi1iQf4Lredve3PMbRjw41BI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createProjectionTables() {
  try {
    console.log('🚀 Iniciando criação das tabelas de projeção...');
    
    // Ler o arquivo SQL
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20250115_create_projection_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar o SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Erro ao executar SQL:', error);
      return;
    }
    
    console.log('✅ Tabelas de projeção criadas com sucesso!');
    console.log('📊 Tabelas criadas:');
    console.log('   - city_goals');
    console.log('   - neighborhood_goals');
    console.log('   - leader_areas');
    console.log('   - vw_votes_by_city (view)');
    console.log('   - vw_votes_by_neighborhood (view)');
    
  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createProjectionTables();
}

export { createProjectionTables };

