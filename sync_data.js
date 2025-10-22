// Script para sincronizar dados do Supabase online para local
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configurações do Supabase online
const supabaseUrl = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDMzMzUsImV4cCI6MjA3MTM3OTMzNX0.yYNiRdi0Ve9fzdAHGYsIi1iQf4Lredve3PMbRjw41BI';

// Configurações do Supabase local
const localUrl = 'http://127.0.0.1:54321';
const localKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabaseOnline = createClient(supabaseUrl, supabaseKey);
const supabaseLocal = createClient(localUrl, localKey);

async function syncData() {
  console.log('🔄 Iniciando sincronização de dados...');
  
  try {
    // Lista de tabelas para sincronizar
    const tables = [
      'profiles',
      'people', 
      'leader_profiles',
      'leader_targets',
      'tags',
      'people_tags',
      'city_goals',
      'neighborhood_goals',
      'election_settings',
      'public_settings',
      'org_settings',
      'app_admins'
    ];
    
    for (const table of tables) {
      console.log(`📊 Sincronizando tabela: ${table}`);
      
      // Buscar dados do online
      const { data, error } = await supabaseOnline
        .from(table)
        .select('*');
        
      if (error) {
        console.log(`⚠️  Erro ao buscar dados da tabela ${table}:`, error.message);
        continue;
      }
      
      if (!data || data.length === 0) {
        console.log(`ℹ️  Tabela ${table} está vazia no online`);
        continue;
      }
      
      console.log(`📥 Encontrados ${data.length} registros na tabela ${table}`);
      
      // Limpar dados locais
      await supabaseLocal.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Inserir dados no local
      const { error: insertError } = await supabaseLocal
        .from(table)
        .insert(data);
        
      if (insertError) {
        console.log(`❌ Erro ao inserir dados na tabela ${table}:`, insertError.message);
      } else {
        console.log(`✅ Tabela ${table} sincronizada com sucesso!`);
      }
    }
    
    console.log('🎉 Sincronização concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a sincronização:', error);
  }
}

syncData();
