#!/usr/bin/env node

/**
 * Script Principal de Sincronização
 * 
 * Este script orquestra todo o processo de sincronização:
 * 1. Instala o Supabase CLI (se necessário)
 * 2. Configura o Supabase local
 * 3. Inicializa o Supabase local
 * 4. Sincroniza os dados do online para local
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const CONFIG = {
  PROJECT_ROOT: path.join(__dirname, '..'),
  SCRIPTS_DIR: __dirname,
  ENV_FILE: path.join(__dirname, '..', '.env'),
  ENV_LOCAL_FILE: path.join(__dirname, '..', '.env.local')
};

// Função para executar comandos com output em tempo real
async function runCommand(command, options = {}) {
  console.log(`🔧 Executando: ${command}`);
  
  return new Promise((resolve, reject) => {
    const child = exec(command, { 
      cwd: CONFIG.PROJECT_ROOT,
      ...options 
    });
    
    child.stdout?.on('data', (data) => {
      process.stdout.write(data);
    });
    
    child.stderr?.on('data', (data) => {
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Comando falhou com código ${code}`));
      }
    });
  });
}

// Função para verificar se um comando existe
async function commandExists(command) {
  try {
    await execAsync(`where ${command}`, { cwd: CONFIG.PROJECT_ROOT });
    return true;
  } catch {
    return false;
  }
}

// Função para verificar se o arquivo .env existe
function checkEnvFile() {
  if (!fs.existsSync(CONFIG.ENV_FILE)) {
    console.error('❌ Arquivo .env não encontrado!');
    console.log('💡 Crie o arquivo .env baseado no env.example');
    console.log('   cp env.example .env');
    return false;
  }
  return true;
}

// Função para instalar Supabase CLI
async function installSupabaseCLI() {
  console.log('🔧 Verificando Supabase CLI...');
  
  if (await commandExists('supabase')) {
    console.log('✅ Supabase CLI já está instalado');
    return true;
  }
  
  console.log('📦 Instalando Supabase CLI...');
  
  try {
    // Tentar instalar via PowerShell
    const installScript = path.join(CONFIG.SCRIPTS_DIR, 'install-supabase-cli.ps1');
    await runCommand(`powershell -ExecutionPolicy Bypass -File "${installScript}"`);
    
    // Verificar se foi instalado
    if (await commandExists('supabase')) {
      console.log('✅ Supabase CLI instalado com sucesso!');
      return true;
    } else {
      console.log('⚠️  Supabase CLI pode não ter sido instalado corretamente');
      console.log('💡 Tente instalar manualmente ou reinicie o terminal');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro na instalação do Supabase CLI:', error.message);
    console.log('💡 Instale manualmente: https://supabase.com/docs/guides/cli');
    return false;
  }
}

// Função para configurar Supabase local
async function setupLocalSupabase() {
  console.log('⚙️  Configurando Supabase local...');
  
  try {
    const setupScript = path.join(CONFIG.SCRIPTS_DIR, 'setup-local-supabase.js');
    await runCommand(`node "${setupScript}"`);
    return true;
  } catch (error) {
    console.error('❌ Erro na configuração do Supabase local:', error.message);
    return false;
  }
}

// Função para inicializar Supabase local
async function startLocalSupabase() {
  console.log('🚀 Iniciando Supabase local...');
  
  try {
    // Verificar se já está rodando
    try {
      await runCommand('supabase status', { stdio: 'pipe' });
      console.log('✅ Supabase local já está rodando');
      return true;
    } catch {
      // Não está rodando, vamos iniciar
    }
    
    // Inicializar
    await runCommand('supabase start');
    
    // Aguardar um pouco para garantir que iniciou
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verificar status
    await runCommand('supabase status');
    
    console.log('✅ Supabase local iniciado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao iniciar Supabase local:', error.message);
    return false;
  }
}

// Função para obter chaves do Supabase local
async function getLocalKeys() {
  console.log('🔑 Obtendo chaves do Supabase local...');
  
  try {
    const { stdout } = await execAsync('supabase status', { cwd: CONFIG.PROJECT_ROOT });
    
    // Extrair URL e chave anônima
    const urlMatch = stdout.match(/API URL:\s*(.+)/);
    const keyMatch = stdout.match(/anon key:\s*(.+)/);
    
    if (urlMatch && keyMatch) {
      const url = urlMatch[1].trim();
      const key = keyMatch[1].trim();
      
      console.log(`✅ URL: ${url}`);
      console.log(`✅ Chave: ${key.substring(0, 20)}...`);
      
      return { url, key };
    } else {
      throw new Error('Não foi possível extrair as chaves do status');
    }
  } catch (error) {
    console.error('❌ Erro ao obter chaves do Supabase local:', error.message);
    return null;
  }
}

// Função para atualizar arquivo .env.local
function updateEnvLocal(keys) {
  if (!keys) return false;
  
  console.log('📝 Atualizando arquivo .env.local...');
  
  try {
    let envContent = '';
    
    if (fs.existsSync(CONFIG.ENV_LOCAL_FILE)) {
      envContent = fs.readFileSync(CONFIG.ENV_LOCAL_FILE, 'utf8');
    }
    
    // Atualizar ou adicionar as chaves
    envContent = envContent.replace(
      /VITE_SUPABASE_URL=.*/g, 
      `VITE_SUPABASE_URL=${keys.url}`
    );
    envContent = envContent.replace(
      /SUPABASE_LOCAL_URL=.*/g, 
      `SUPABASE_LOCAL_URL=${keys.url}`
    );
    envContent = envContent.replace(
      /VITE_SUPABASE_ANON_KEY=.*/g, 
      `VITE_SUPABASE_ANON_KEY=${keys.key}`
    );
    envContent = envContent.replace(
      /SUPABASE_LOCAL_ANON_KEY=.*/g, 
      `SUPABASE_LOCAL_ANON_KEY=${keys.key}`
    );
    
    fs.writeFileSync(CONFIG.ENV_LOCAL_FILE, envContent);
    console.log('✅ Arquivo .env.local atualizado!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar .env.local:', error.message);
    return false;
  }
}

// Função para sincronizar dados
async function syncData() {
  console.log('🔄 Sincronizando dados...');
  
  try {
    const syncScript = path.join(CONFIG.SCRIPTS_DIR, 'sync-supabase.js');
    await runCommand(`node "${syncScript}"`);
    return true;
  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('🎯 SINCRONIZAÇÃO COMPLETA SUPABASE ONLINE → LOCAL');
  console.log('=' .repeat(60));
  
  // Verificar arquivo .env
  if (!checkEnvFile()) {
    process.exit(1);
  }
  
  const steps = [
    { name: 'Instalar Supabase CLI', fn: installSupabaseCLI },
    { name: 'Configurar Supabase local', fn: setupLocalSupabase },
    { name: 'Inicializar Supabase local', fn: startLocalSupabase },
    { name: 'Obter chaves locais', fn: async () => {
      const keys = await getLocalKeys();
      if (keys) {
        updateEnvLocal(keys);
        return true;
      }
      return false;
    }},
    { name: 'Sincronizar dados', fn: syncData }
  ];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`\n📋 Passo ${i + 1}/${steps.length}: ${step.name}`);
    console.log('-'.repeat(50));
    
    try {
      const success = await step.fn();
      if (!success) {
        console.error(`❌ Falha no passo: ${step.name}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Erro no passo ${step.name}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('='.repeat(60));
  console.log('📊 Seu Supabase local está sincronizado com o online');
  console.log('🌐 Acesse o Studio em: http://localhost:54323');
  console.log('🔧 Para parar o Supabase local: supabase stop');
  console.log('🔄 Para sincronizar novamente: node scripts/sync-all.js');
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Erro fatal:', error.message);
    process.exit(1);
  });
}

export { main as syncAll };
