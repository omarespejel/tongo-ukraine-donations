# Starknet Privacy Toolkit - Docker Helper Script for Windows
# PowerShell version

param(
    [Parameter(Position=0)]
    [string]$Command,
    
    [Parameter(Position=1, ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

# Colors for output
function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

# Check if .env exists
function Check-Env {
    if (-not (Test-Path .env)) {
        Write-Warning-Custom ".env file not found. Creating from .env.example..."
        Copy-Item .env.example .env
        Write-Info "Please edit .env file with your configuration before running the app"
        exit 1
    }
    Write-Success ".env file found"
}

# Build Docker image
function Build-Image {
    Write-Info "Building Docker image..."
    docker-compose build --no-cache
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker image built successfully"
    } else {
        Write-Error-Custom "Failed to build Docker image"
        exit 1
    }
}

# Start services
function Start-Services {
    Check-Env
    Write-Info "Starting services..."
    docker-compose up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Services started successfully"
        Write-Info "Web UI: http://localhost:8080"
        Write-Info "API: http://localhost:3001"
    } else {
        Write-Error-Custom "Failed to start services"
        exit 1
    }
}

# Stop services
function Stop-Services {
    Write-Info "Stopping services..."
    docker-compose down
    Write-Success "Services stopped"
}

# Restart services
function Restart-Services {
    Stop-Services
    Start-Services
}

# View logs
function Show-Logs {
    docker-compose logs -f
}

# Execute command in container
function Exec-Command {
    param([string[]]$CmdArgs)
    docker-compose exec app $CmdArgs
}

# Generate ZK proof
function Generate-Proof {
    param([string[]]$ProofArgs)
    Write-Info "Generating ZK proof..."
    $argsString = $ProofArgs -join ' '
    docker-compose exec app bash -c "cd /app/zk-badges && ./generate-proof.sh $argsString"
}

# Compile Noir circuit
function Compile-Circuit {
    Write-Info "Compiling Noir circuit..."
    docker-compose exec app bash -c "cd /app/zk-badges/donation_badge && nargo compile"
    Write-Success "Circuit compiled"
}

# Build Cairo verifier
function Build-Verifier {
    Write-Info "Building Cairo verifier..."
    docker-compose exec app bash -c "cd /app/donation_badge_verifier && scarb build"
    Write-Success "Verifier built"
}

# Run tests
function Run-Tests {
    Write-Info "Running tests..."
    docker-compose exec app bash -c "cd /app/zk-badges/donation_badge && nargo test"
    Write-Success "Tests completed"
}

# Clean up
function Clean-All {
    $response = Read-Host "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    if ($response -match '^[yY](es)?$') {
        Write-Info "Cleaning up..."
        docker-compose down -v --rmi all
        Write-Success "Cleanup completed"
    } else {
        Write-Info "Cleanup cancelled"
    }
}

# Shell access
function Open-Shell {
    Write-Info "Opening shell in container..."
    docker-compose exec app bash
}

# Show status
function Show-Status {
    docker-compose ps
}

# Help
function Show-Help {
    @"
Starknet Privacy Toolkit - Docker Helper (Windows)

Usage: .\docker-helper.ps1 [command] [args]

Commands:
    build           Build Docker image
    start           Start all services
    stop            Stop all services
    restart         Restart all services
    logs            View logs (follow mode)
    status          Show container status
    
    shell           Open bash shell in container
    exec [cmd]      Execute command in container
    
    compile         Compile Noir circuit
    build-verifier  Build Cairo verifier contract
    test            Run Noir circuit tests
    proof [args]    Generate ZK proof (pass args to generate-proof.sh)
    
    clean           Remove all containers, volumes, and images
    help            Show this help message

Examples:
    .\docker-helper.ps1 start
    .\docker-helper.ps1 logs
    .\docker-helper.ps1 proof --amount 1000 --threshold 1000 --donor-secret hunter2 --tier 1
    .\docker-helper.ps1 exec bun run build

"@
}

# Main script logic
switch ($Command) {
    "build" { Build-Image }
    "start" { Start-Services }
    "stop" { Stop-Services }
    "restart" { Restart-Services }
    "logs" { Show-Logs }
    "status" { Show-Status }
    "shell" { Open-Shell }
    "exec" { Exec-Command $Args }
    "compile" { Compile-Circuit }
    "build-verifier" { Build-Verifier }
    "test" { Run-Tests }
    "proof" { Generate-Proof $Args }
    "clean" { Clean-All }
    { $_ -in "help", "--help", "-h", "" } { Show-Help }
    default {
        Write-Error-Custom "Unknown command: $Command"
        Write-Host ""
        Show-Help
        exit 1
    }
}
