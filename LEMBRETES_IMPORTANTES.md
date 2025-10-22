# 🚨 LEMBRETES CRÍTICOS - SEMPRE VERIFICAR ANTES DE EXECUTAR COMANDOS

## ⚠️ REGRA DE OURO: SEMPRE VERIFICAR A PASTA DO PROJETO

**ANTES DE QUALQUER COMANDO `npx supabase` ou `npm run dev`, SEMPRE:**

1. **Verificar se está na pasta correta:**
   ```bash
   cd "E:\Programas em desevolvimento\gestaopolitica"
   ```

2. **Confirmar que está na pasta certa:**
   ```bash
   pwd
   # Deve mostrar: E:\Programas em desevolvimento\gestaopolitica
   ```

3. **Verificar se o package.json existe:**
   ```bash
   ls package.json
   # Deve mostrar o arquivo package.json
   ```

## 🔥 COMANDOS QUE SEMPRE PRECISAM DA PASTA CORRETA

### Supabase Commands:
- `npx supabase start`
- `npx supabase stop`
- `npx supabase status`
- `npx supabase functions serve`
- `npx supabase functions deploy`

### NPM Commands:
- `npm run dev`
- `npm install`
- `npm run build`

## 🚫 ERROS COMUNS QUE ACONTECEM QUANDO NÃO ESTÁ NA PASTA CORRETA

1. **`npm error code ENOENT`** - package.json não encontrado
2. **`supabase start is not running`** - Supabase não consegue encontrar o projeto
3. **`Could not read package.json`** - Está na pasta errada
4. **`The system cannot find the file specified`** - Arquivos do projeto não encontrados

## ✅ CHECKLIST ANTES DE EXECUTAR QUALQUER COMANDO

- [ ] Navegar para a pasta do projeto: `cd "E:\Programas em desevolvimento\gestaopolitica"`
- [ ] Verificar se está na pasta correta: `pwd`
- [ ] Confirmar que package.json existe: `ls package.json`
- [ ] Só então executar o comando desejado

## 📍 PASTA DO PROJETO

**SEMPRE USAR:**
```
E:\Programas em desevolvimento\gestaopolitica
```

**NUNCA USAR:**
- `C:\Users\adils\`
- Qualquer outra pasta que não seja a do projeto

## 🎯 COMANDOS DE VERIFICAÇÃO RÁPIDA

```bash
# Verificar pasta atual
pwd

# Verificar se está no projeto certo
ls package.json

# Verificar se Supabase está rodando
npx supabase status
```

---

**LEMBRE-SE: 99% dos erros acontecem porque não está na pasta correta do projeto!**


