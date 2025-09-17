# Script de Instalação do Supabase CLI para Windows
# Este script instala o Supabase CLI usando diferentes métodos

Write-Host "🔧 Instalando Supabase CLI..." -ForegroundColor Green

# Função para verificar se um comando existe
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Função para instalar via Scoop
function Install-ViaScoop {
    Write-Host "📦 Tentando instalar via Scoop..." -ForegroundColor Yellow
    
    if (Test-Command "scoop") {
        try {
            scoop install supabase
            Write-Host "✅ Supabase CLI instalado via Scoop!" -ForegroundColor Green
            return $true
        }
        catch {
            Write-Host "❌ Falha na instalação via Scoop: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
    else {
        Write-Host "⚠️  Scoop não está instalado" -ForegroundColor Yellow
        return $false
    }
}

# Função para instalar via Chocolatey
function Install-ViaChocolatey {
    Write-Host "🍫 Tentando instalar via Chocolatey..." -ForegroundColor Yellow
    
    if (Test-Command "choco") {
        try {
            choco install supabase -y
            Write-Host "✅ Supabase CLI instalado via Chocolatey!" -ForegroundColor Green
            return $true
        }
        catch {
            Write-Host "❌ Falha na instalação via Chocolatey: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
    else {
        Write-Host "⚠️  Chocolatey não está instalado" -ForegroundColor Yellow
        return $false
    }
}

# Função para instalar via download direto
function Install-ViaDownload {
    Write-Host "⬇️  Tentando instalar via download direto..." -ForegroundColor Yellow
    
    try {
        # Criar pasta de instalação
        $installDir = "$env:USERPROFILE\.supabase"
        if (!(Test-Path $installDir)) {
            New-Item -ItemType Directory -Path $installDir -Force | Out-Null
        }
        
        # URL do release mais recente (Windows x64)
        $releaseUrl = "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip"
        $zipPath = "$installDir\supabase.zip"
        
        # Baixar o arquivo
        Write-Host "📥 Baixando Supabase CLI..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $releaseUrl -OutFile $zipPath -UseBasicParsing
        
        # Extrair o arquivo
        Write-Host "📦 Extraindo arquivo..." -ForegroundColor Yellow
        Expand-Archive -Path $zipPath -DestinationPath $installDir -Force
        
        # Remover arquivo zip
        Remove-Item $zipPath -Force
        
        # Adicionar ao PATH se não estiver
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
        if ($currentPath -notlike "*$installDir*") {
            [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$installDir", "User")
            Write-Host "✅ Adicionado ao PATH do usuário" -ForegroundColor Green
        }
        
        Write-Host "✅ Supabase CLI instalado via download!" -ForegroundColor Green
        Write-Host "💡 Reinicie o terminal para usar o comando 'supabase'" -ForegroundColor Yellow
        return $true
    }
    catch {
        Write-Host "❌ Falha na instalação via download: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para instalar Scoop se não estiver instalado
function Install-Scoop {
    Write-Host "📦 Instalando Scoop..." -ForegroundColor Yellow
    
    try {
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
        Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
        Write-Host "✅ Scoop instalado com sucesso!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Falha na instalação do Scoop: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para instalar Chocolatey se não estiver instalado
function Install-Chocolatey {
    Write-Host "🍫 Instalando Chocolatey..." -ForegroundColor Yellow
    
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Write-Host "✅ Chocolatey instalado com sucesso!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Falha na instalação do Chocolatey: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Verificar se já está instalado
if (Test-Command "supabase") {
    Write-Host "✅ Supabase CLI já está instalado!" -ForegroundColor Green
    supabase --version
    exit 0
}

# Tentar diferentes métodos de instalação
$installed = $false

# Método 1: Scoop
if (!$installed) {
    if (!(Test-Command "scoop")) {
        Write-Host "📦 Scoop não encontrado. Instalando..." -ForegroundColor Yellow
        if (Install-Scoop) {
            $installed = Install-ViaScoop
        }
    } else {
        $installed = Install-ViaScoop
    }
}

# Método 2: Chocolatey
if (!$installed) {
    if (!(Test-Command "choco")) {
        Write-Host "🍫 Chocolatey não encontrado. Instalando..." -ForegroundColor Yellow
        if (Install-Chocolatey) {
            $installed = Install-ViaChocolatey
        }
    } else {
        $installed = Install-ViaChocolatey
    }
}

# Método 3: Download direto
if (!$installed) {
    $installed = Install-ViaDownload
}

# Resultado final
if ($installed) {
    Write-Host "`n🎉 Supabase CLI instalado com sucesso!" -ForegroundColor Green
    Write-Host "💡 Reinicie o terminal e execute 'supabase --version' para verificar" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Falha na instalação do Supabase CLI" -ForegroundColor Red
    Write-Host "💡 Tente instalar manualmente:" -ForegroundColor Yellow
    Write-Host "   1. Baixe de: https://github.com/supabase/cli/releases" -ForegroundColor Yellow
    Write-Host "   2. Extraia e adicione ao PATH" -ForegroundColor Yellow
    exit 1
}
