#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Função para processar um arquivo
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Substituir console.log por devLog (apenas se não for logger.ts)
    if (!filePath.includes('logger.ts') && !filePath.includes('node_modules')) {
      const originalContent = content;
      
      // Substituir console.log por devLog
      content = content.replace(/console\.log\(/g, 'devLog(');
      content = content.replace(/console\.info\(/g, 'devLog(');
      content = content.replace(/console\.warn\(/g, 'devLog(');
      
      // Manter console.error como está (são importantes)
      
      if (content !== originalContent) {
        // Adicionar import do devLog se não existir
        if (content.includes('devLog(') && !content.includes("import { devLog }")) {
          // Encontrar a primeira linha de import
          const lines = content.split('\n');
          let insertIndex = 0;
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ') || lines[i].startsWith('const ') || lines[i].startsWith('function ')) {
              insertIndex = i;
              break;
            }
          }
          
          // Inserir o import do devLog
          lines.splice(insertIndex, 0, "import { devLog } from '@/lib/logger';");
          content = lines.join('\n');
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Processado: ${filePath}`);
        modified = true;
      }
    }

    return modified;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Função para processar diretório recursivamente
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  let totalModified = 0;

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
      totalModified += processDirectory(fullPath);
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
      if (processFile(fullPath)) {
        totalModified++;
      }
    }
  }

  return totalModified;
}

// Executar o script
console.log('🔧 Iniciando correção de logs...');
const srcPath = path.join(__dirname, '..', 'src');
const modified = processDirectory(srcPath);
console.log(`✅ Processamento concluído! ${modified} arquivos modificados.`);

