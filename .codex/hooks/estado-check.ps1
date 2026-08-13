# estado-check.ps1 - hook SessionStart do SaaS Base.
# Imprime o estado atual do projeto e avisa se ESTADO.md e ROADMAP.md divergiram.
# Defensivo: sem plans/ESTADO.md, sai em silencio. NUNCA bloqueia a sessao.
#
# ASCII puro de proposito: o PowerShell 5.1 le .ps1 no codepage do SO, entao
# caractere non-ASCII literal (emoji, travessao) quebra o parser. O marcador de
# item ativo vem por codepoint em $ATIVO.

$ErrorActionPreference = "SilentlyContinue"

# U+1F535 = circulo azul, o marcador de "item ativo" no vocabulario de status.
$ATIVO = [char]::ConvertFromUtf32(0x1F535)

$estadoPath  = Join-Path $PWD "plans\ESTADO.md"
$roadmapPath = Join-Path $PWD "plans\ROADMAP.md"

if (-not (Test-Path $estadoPath)) { exit 0 }

function Read-Utf8([string]$Path) {
  try { [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8) } catch { "" }
}

$estado = Read-Utf8 $estadoPath
if ([string]::IsNullOrWhiteSpace($estado)) { exit 0 }

# --- 1. Imprime as secoes que importam: Agora, Travado, Esperando voce ---
# Comentarios HTML sao instrucao de template, nao estado - fora da saida.
$estadoLimpo = [regex]::Replace($estado, '(?s)<!--.*?-->', '')
$linhas = $estadoLimpo -split "`r?`n"
$querido = @("## Agora", "## Travado", "## Esperando")
$saida = New-Object System.Collections.Generic.List[string]
$dentro = $false

foreach ($linha in $linhas) {
  if ($linha -match '^##\s') {
    $dentro = $false
    foreach ($alvo in $querido) {
      if ($linha.StartsWith($alvo)) { $dentro = $true; break }
    }
  }
  if ($dentro) { $saida.Add($linha) }
}

Write-Host ""
Write-Host "=== plans/ESTADO.md ===" -ForegroundColor Cyan
if ($saida.Count -gt 0) {
  # Corta em 40 linhas: o hook e um lembrete, nao um despejo do arquivo.
  $saida | Select-Object -First 40 | ForEach-Object { Write-Host $_ }
  if ($saida.Count -gt 40) { Write-Host "  [...] (resto em plans/ESTADO.md)" -ForegroundColor DarkGray }
} else {
  Write-Host "(sem as secoes Agora/Travado/Esperando voce)" -ForegroundColor DarkGray
}

# --- 2. Valida a ponte ESTADO <-> ROADMAP ---
if (-not (Test-Path $roadmapPath)) {
  Write-Host ""
  Write-Host "[aviso] plans/ESTADO.md existe mas plans/ROADMAP.md nao. A fila nao tem onde morar." -ForegroundColor Yellow
  Write-Host ""
  exit 0
}

$roadmap = Read-Utf8 $roadmapPath
$avisos = New-Object System.Collections.Generic.List[string]

# ID do item ativo: so conta a DECLARACAO no formato do template - uma linha da
# secao "## Agora" com o ID e o marcador de ativo juntos. Mencao em prosa
# ("R-10 fechou nesta sessao") nao declara item ativo.
$idEstado = $null
$mAgora = [regex]::Match($estadoLimpo, '(?ms)^##\s+Agora\s*$(.*?)(?=^##\s|\z)')
if ($mAgora.Success) {
  foreach ($linha in ($mAgora.Groups[1].Value -split "`r?`n")) {
    if ($linha.Contains($ATIVO)) {
      $m = [regex]::Match($linha, 'R-\d{2,}')
      if ($m.Success) { $idEstado = $m.Value; break }
    }
  }
}

# IDs marcados como ativo no ROADMAP - linha a linha, para nao cruzar linhas da tabela
$idsAtivos = New-Object System.Collections.Generic.List[string]
foreach ($linha in ($roadmap -split "`r?`n")) {
  if ($linha.Contains($ATIVO)) {
    $mm = [regex]::Match($linha, 'R-\d{2,}')
    if ($mm.Success -and -not $idsAtivos.Contains($mm.Value)) { $idsAtivos.Add($mm.Value) }
  }
}

if ($idsAtivos.Count -gt 1) {
  $avisos.Add("ROADMAP tem $($idsAtivos.Count) itens ativos ($($idsAtivos -join ', ')) - so 1 e permitido.")
}

if ($idEstado) {
  if ($idsAtivos.Count -eq 0) {
    $avisos.Add("ESTADO aponta $idEstado, mas nenhum item esta ativo no ROADMAP.")
  } elseif (-not $idsAtivos.Contains($idEstado)) {
    $avisos.Add("ESTADO aponta $idEstado, mas o ativo no ROADMAP e $($idsAtivos -join ', ').")
  }
  if ($roadmap -notmatch [regex]::Escape($idEstado)) {
    $avisos.Add("$idEstado nao existe no ROADMAP.")
  }
}

# Spec ativa sem item correspondente no roadmap
$specsDir = Join-Path $PWD "plans\specs"
if (Test-Path $specsDir) {
  foreach ($f in (Get-ChildItem $specsDir -Filter "R-*.md" -ErrorAction SilentlyContinue)) {
    $idSpec = [regex]::Match($f.Name, 'R-\d{2,}').Value
    if ($idSpec -and ($roadmap -notmatch [regex]::Escape($idSpec))) {
      $avisos.Add("spec $($f.Name) nao tem item correspondente no ROADMAP.")
    }
  }
}

# Documento inchado e o modo de falha nº1: instrucao espalhada por 50 secoes
# deixa de ser instrucao. Teto estourado = erro de recorte, nao licenca pra escrever mais.
function Test-Tamanho([string]$Path, [int]$Teto, [string]$Rotulo, [string]$Remedio) {
  if (-not (Test-Path $Path)) { return }
  $n = (Get-Content $Path -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
  if ($n -gt $Teto) { $script:avisos.Add("$Rotulo tem $n linhas (teto ~$Teto). $Remedio") }
}

Test-Tamanho $estadoPath  80  "ESTADO.md"  "Esta virando handoff - corte pro que esta ativo agora."
Test-Tamanho $roadmapPath 200 "ROADMAP.md" "Detalhe vazou pro mapa - manda pra spec."
if (Test-Path $specsDir) {
  foreach ($f in (Get-ChildItem $specsDir -Filter "R-*.md" -ErrorAction SilentlyContinue)) {
    Test-Tamanho $f.FullName 300 "spec $($f.Name)" "O item e grande demais - quebre em sub-itens."
  }
}

if ($avisos.Count -gt 0) {
  Write-Host ""
  foreach ($a in $avisos) { Write-Host "[aviso] $a" -ForegroundColor Yellow }
}

Write-Host ""
exit 0
