# Roteiro 2 - Etapa 94
# Revisao final de codigo, imports e arquivos duplicados
# Este script NAO altera nem apaga arquivos. Ele apenas confere pontos sensiveis.

$ErrorActionPreference = "Continue"
$raiz = Get-Location

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "ROTEIRO 2 - ETAPA 94 | LIMPEZA FINAL DE CODIGO" -ForegroundColor Cyan
Write-Host "Pasta analisada: $raiz" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

function Mostrar-Titulo($texto) {
    Write-Host "`n------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host $texto -ForegroundColor Yellow
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
}

function Testar-Arquivo($caminho) {
    if (Test-Path $caminho) {
        Write-Host "OK  - $caminho" -ForegroundColor Green
    } else {
        Write-Host "FALTA - $caminho" -ForegroundColor Red
    }
}

Mostrar-Titulo "1. Arquivos principais esperados"
$arquivosEsperados = @(
    "src\App.jsx",
    "src\lib\supabaseClient.js",
    "src\components\dashboard\Dashboard.jsx",
    "src\components\auditoria\DashboardAuditoriaCampo.jsx",
    "src\components\auditoria\NovaAuditoriaCampoDireta.jsx",
    "src\components\auditoria\RelatorioAuditoria.jsx",
    "src\components\treinamentos\TreinamentosPage.jsx",
    "src\components\treinamentos\FormularioLancamentoCertificado.jsx",
    "src\components\treinamentos\EnvioLoteTreinamentos.jsx",
    "src\components\treinamentos\BaseCertificadosTreinamentos.jsx",
    "src\components\configuracoes\ConfiguracoesSistema.jsx",
    "src\constants\sistemaLimitesConstants.js",
    "src\constants\auditoriaPublicaConstants.js",
    "src\services\certificadosStorageService.js",
    "src\services\auditoriaSistemaConfigService.js",
    "src\services\auditoriaPublicaSegurancaService.js",
    "src\services\storageSegurancaService.js",
    "src\services\supabaseRevisaoService.js"
)
$arquivosEsperados | ForEach-Object { Testar-Arquivo $_ }

Mostrar-Titulo "2. Procurando arquivos duplicados que confundem Visual Studio/ESLint"
$pastasIgnoradas = @("node_modules", ".git", "dist", "build", ".vercel")
$duplicados = Get-ChildItem -Path . -Recurse -File -Include "App (*.jsx", "Dashboard (*.jsx", "RelatorioAuditoria (*.jsx", "ConfiguracoesSistema (*.jsx" -ErrorAction SilentlyContinue |
    Where-Object {
        $caminho = $_.FullName
        -not ($pastasIgnoradas | Where-Object { $caminho -like "*\$_\*" })
    }

if ($duplicados.Count -eq 0) {
    Write-Host "OK - nenhum arquivo duplicado encontrado." -ForegroundColor Green
} else {
    Write-Host "ATENCAO - arquivos duplicados encontrados:" -ForegroundColor Red
    $duplicados | ForEach-Object { Write-Host $_.FullName -ForegroundColor Red }
    Write-Host "Remova manualmente somente os duplicados. Nao apague src\App.jsx." -ForegroundColor Yellow
}

Mostrar-Titulo "3. Procurando marcadores de merge/conflito"
$marcadores = Select-String -Path "src\**\*.jsx", "src\**\*.js" -Pattern "<<<<<<<", ">>>>>>>", "=======" -ErrorAction SilentlyContinue
if ($marcadores) {
    Write-Host "ATENCAO - possiveis conflitos de merge encontrados:" -ForegroundColor Red
    $marcadores | ForEach-Object { Write-Host "$($_.Path):$($_.LineNumber) $($_.Line)" -ForegroundColor Red }
} else {
    Write-Host "OK - nenhum marcador de conflito encontrado." -ForegroundColor Green
}

Mostrar-Titulo "4. Conferindo usos criticos separados do App.jsx"
$checks = @(
    @{Arquivo="src\App.jsx"; Texto="React.lazy"},
    @{Arquivo="src\App.jsx"; Texto="ConfiguracoesSistema"},
    @{Arquivo="src\App.jsx"; Texto="certificadosStorageService"},
    @{Arquivo="src\components\configuracoes\ConfiguracoesSistema.jsx"; Texto="Revisao geral Supabase"},
    @{Arquivo="src\components\configuracoes\ConfiguracoesSistema.jsx"; Texto="Revisão geral Supabase"},
    @{Arquivo="src\components\auditoria\RelatorioAuditoria.jsx"; Texto="Carregar mais registros"},
    @{Arquivo="src\components\auditoria\DashboardAuditoriaCampo.jsx"; Texto="Carregar mais auditorias"},
    @{Arquivo="src\components\auditoria\DashboardAuditoriaCampo.jsx"; Texto="Carregar QR Codes"}
)
foreach ($check in $checks) {
    if (Test-Path $check.Arquivo) {
        $resultado = Select-String -Path $check.Arquivo -Pattern $check.Texto -SimpleMatch -ErrorAction SilentlyContinue
        if ($resultado) {
            Write-Host "OK  - $($check.Texto) em $($check.Arquivo)" -ForegroundColor Green
        } else {
            Write-Host "VERIFICAR - $($check.Texto) nao encontrado em $($check.Arquivo)" -ForegroundColor Yellow
        }
    }
}

Mostrar-Titulo "5. Rodando build"
Write-Host "Executando: npm run build" -ForegroundColor Cyan
npm run build
$buildExit = $LASTEXITCODE
if ($buildExit -eq 0) {
    Write-Host "OK - build passou." -ForegroundColor Green
} else {
    Write-Host "ERRO - build falhou. Corrija antes de commitar." -ForegroundColor Red
}

Mostrar-Titulo "6. Git status"
git status --short
if ($LASTEXITCODE -eq 0) {
    Write-Host "Conferencia de Git executada." -ForegroundColor Cyan
}

Mostrar-Titulo "7. Proximos testes manuais obrigatorios"
$testes = @(
    "Login",
    "Dashboard SST e botao Atualizar informacoes",
    "Configuracoes e organizacao dos cards",
    "Eventos da Auditoria de sistema",
    "Limites de carregamento",
    "Auditoria publica e QR Code",
    "Checklist de seguranca publica",
    "Checklist Storage",
    "Checklist Supabase/RLS/RPC",
    "Treinamentos: envio individual e lote",
    "Base de certificados",
    "Dashboard Auditoria: carregar mais auditorias e QR Codes",
    "Auditoria de sistema: carregar mais registros",
    "QR publico de colaborador",
    "Auditoria publica por link/token"
)
$testes | ForEach-Object { Write-Host "- $_" -ForegroundColor White }

Write-Host "`nEtapa 94 finalizada. Se o build passou e o Git estiver limpo, pode seguir para a Etapa 95." -ForegroundColor Cyan
