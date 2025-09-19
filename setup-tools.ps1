# Setup script to install required tools for Travel Companion
Write-Host "🔧 Setting up required tools for Travel Companion..." -ForegroundColor Blue

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "⚠️ This script should be run as Administrator for best results" -ForegroundColor Yellow
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if Chocolatey is installed
try {
    choco --version | Out-Null
    Write-Host "✅ Chocolatey found" -ForegroundColor Green
    $hasChoco = $true
} catch {
    Write-Host "⚠️ Chocolatey not found. Installing..." -ForegroundColor Yellow
    $hasChoco = $false
}

# Install Chocolatey if not present
if (-not $hasChoco) {
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Write-Host "✅ Chocolatey installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install Chocolatey" -ForegroundColor Red
    }
}

# Install AWS CLI
try {
    aws --version | Out-Null
    Write-Host "✅ AWS CLI already installed" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing AWS CLI..." -ForegroundColor Yellow
    try {
        if ($hasChoco) {
            choco install awscli -y
        } else {
            # Download and install AWS CLI manually
            $url = "https://awscli.amazonaws.com/AWSCLIV2.msi"
            $output = "$env:TEMP\AWSCLIV2.msi"
            Write-Host "Downloading AWS CLI..." -ForegroundColor Gray
            Invoke-WebRequest -Uri $url -OutFile $output
            Write-Host "Installing AWS CLI..." -ForegroundColor Gray
            Start-Process msiexec.exe -Wait -ArgumentList "/i $output /quiet"
            Remove-Item $output
        }
        Write-Host "✅ AWS CLI installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install AWS CLI automatically" -ForegroundColor Red
        Write-Host "Please download and install manually from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    }
}

# Install AWS CDK
try {
    cdk --version | Out-Null
    Write-Host "✅ AWS CDK already installed" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing AWS CDK..." -ForegroundColor Yellow
    try {
        npm install -g aws-cdk
        Write-Host "✅ AWS CDK installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install AWS CDK" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Setup completed!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Blue
Write-Host "1. Restart PowerShell to refresh PATH" -ForegroundColor White
Write-Host "2. Configure AWS credentials: aws configure" -ForegroundColor White
Write-Host "3. Run deployment: .\deploy.ps1" -ForegroundColor White