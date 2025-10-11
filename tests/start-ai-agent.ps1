# Quick Start Script for AI Travel Agent
# This script starts both backend and frontend servers

Write-Host "🚀 Starting AI Travel Agent..." -ForegroundColor Cyan
Write-Host ""

# Check if backend_test exists
if (!(Test-Path "backend_test")) {
    Write-Host "❌ Error: backend_test folder not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Check if frontend exists
if (!(Test-Path "frontend")) {
    Write-Host "❌ Error: frontend folder not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Start Backend
Write-Host "📦 Starting Backend Server (Port 4000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend_test; npm start"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "🌐 Starting Frontend Server (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "✅ Both servers are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access Points:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:4000" -ForegroundColor White
Write-Host "   AI Agent: http://localhost:3000/ai-agent" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation: AI-AGENT-SETUP.md" -ForegroundColor Yellow
Write-Host "🧪 Test Script:    ./test-ai-agent.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎯 To stop servers: Close the PowerShell windows or press Ctrl+C in each" -ForegroundColor Cyan
