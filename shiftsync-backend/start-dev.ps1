# shiftsync-backend/start-dev.ps1
# Loads .env, then starts all Spring services with Maven.
# Prerequisites: JDK 21 + Maven (or use .tools/ portable copies).

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

# --- Tools (prefer portable .tools/, else system) ---
$PortableJdk = Get-ChildItem "$Root\.tools" -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "jdk*" -or $_.Name -like "microsoft-jdk*" -or $_.Name -like "jdk-21*" } |
  Select-Object -First 1
if ($PortableJdk) {
  $env:JAVA_HOME = $PortableJdk.FullName
  # nested layout: jdk-21.x.x+y
  $nested = Get-ChildItem $PortableJdk.FullName -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($nested -and (Test-Path (Join-Path $nested.FullName "bin\java.exe"))) {
    $env:JAVA_HOME = $nested.FullName
  }
}

$PortableMvn = Get-ChildItem "$Root\.tools" -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "apache-maven*" } |
  Select-Object -First 1
$Mvn = if ($PortableMvn) { Join-Path $PortableMvn.FullName "bin\mvn.cmd" } else { "mvn" }

if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
  Write-Error "JAVA_HOME not set / JDK not found. Install Microsoft OpenJDK 21 or unpack into .tools\"
}

Write-Host "JAVA_HOME=$env:JAVA_HOME"
& (Join-Path $env:JAVA_HOME "bin\java.exe") -version
& $Mvn -v

# --- Load .env into process ---
$envFile = Join-Path $Root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $n, $v = $_ -split '=', 2
    if ($n -and $v) {
      [Environment]::SetEnvironmentVariable($n.Trim(), $v.Trim(), "Process")
    }
  }
  Write-Host "Loaded .env"
} else {
  Write-Warning ".env missing — copy from .env.example"
}

# --- JWT keys check ---
$authPub = Join-Path $Root "auth-service\src\main\resources\keys\public.pem"
$gwPub = Join-Path $Root "gateway\src\main\resources\keys\public.pem"
if (-not (Test-Path $authPub) -or -not (Test-Path $gwPub)) {
  Write-Error "Missing public.pem — run node keygen or openssl first"
}

$services = @(
  @{ name = "gateway";            dir = "gateway";            port = 8080 },
  @{ name = "auth-service";       dir = "auth-service";       port = 8081 },
  @{ name = "user-service";       dir = "user-service";       port = 8082 },
  @{ name = "shift-service";      dir = "shift-service";      port = 8083 },
  @{ name = "attendance-service"; dir = "attendance-service"; port = 8084 },
  @{ name = "fatigue-service";    dir = "fatigue-service";    port = 8085 },
  @{ name = "emergency-service";  dir = "emergency-service";  port = 8086 },
  @{ name = "reporting-service";  dir = "reporting-service";  port = 8087 }
)

Write-Host ""
Write-Host "Starting services (each in its own window)..."
Write-Host "Need Redis on :6379. Postgres/Supabase via DB_URL in .env."
Write-Host ""

foreach ($s in $services) {
  $svcDir = Join-Path $Root $s.dir
  $title = "ShiftSync $($s.name) :$($s.port)"
  $cmd = @"
`$env:JAVA_HOME='$($env:JAVA_HOME)'
`$env:Path = "`$env:JAVA_HOME\bin;" + `$env:Path
Get-Content '$envFile' | ForEach-Object {
  if (`$_ -match '^\s*#' -or `$_ -match '^\s*`$') { return }
  `$n, `$v = `$_ -split '=', 2
  if (`$n -and `$v) { [Environment]::SetEnvironmentVariable(`$n.Trim(), `$v.Trim(), 'Process') }
}
Set-Location '$svcDir'
Write-Host '=== $title ==='
& '$Mvn' spring-boot:run
"@
  Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd -WindowStyle Normal
  Start-Sleep -Seconds 2
}

Write-Host "Launched. Gateway should be http://localhost:8080"
Write-Host "Mobile: cd ..\shiftsync-mobile; npx expo start"
