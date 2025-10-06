#!/usr/bin/env powershell

# Travel Companion Test Runner
# Runs comprehensive test suite for both frontend and backend

param(
    [switch]$Frontend,
    [switch]$Backend,
    [switch]$Coverage,
    [switch]$Watch,
    [switch]$Verbose
)

Write-Host "🧪 Travel Companion Test Suite" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$startTime = Get-Date

function Run-BackendTests {
    Write-Host "`n🔧 Running Backend Tests..." -ForegroundColor Yellow
    Set-Location "backend"
    
    try {
        if ($Coverage) {
            npm test -- --coverage
        } elseif ($Watch) {
            npm run test:watch
        } else {
            npm test
        }
        Write-Host "✅ Backend tests completed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Backend tests failed: $_" -ForegroundColor Red
        throw
    } finally {
        Set-Location ".."
    }
}

function Run-FrontendTests {
    Write-Host "`n🎨 Running Frontend Tests..." -ForegroundColor Yellow
    Set-Location "frontend"
    
    try {
        if ($Coverage) {
            npm test -- --coverage
        } elseif ($Watch) {
            npm run test:watch
        } else {
            npm test
        }
        Write-Host "✅ Frontend tests completed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Frontend tests failed: $_" -ForegroundColor Red
        throw
    } finally {
        Set-Location ".."
    }
}

function Show-TestSummary {
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Host "`n🎉 Test Summary" -ForegroundColor Cyan
    Write-Host "===============" -ForegroundColor Cyan
    Write-Host "Duration: $($duration.TotalSeconds) seconds" -ForegroundColor White
    Write-Host "Completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
    
    if ($Coverage) {
        Write-Host "`n📊 Coverage reports generated in:" -ForegroundColor Yellow
        Write-Host "  - backend/coverage/" -ForegroundColor White
        Write-Host "  - frontend/coverage/" -ForegroundColor White
    }
}

# Main execution
try {
    # Check if specific component requested
    if ($Backend -and -not $Frontend) {
        Run-BackendTests
    } elseif ($Frontend -and -not $Backend) {
        Run-FrontendTests
    } else {
        # Run both by default
        Run-BackendTests
        Run-FrontendTests
    }
    
    Show-TestSummary
    
    Write-Host "`n🚀 All tests passed! Ready for deployment." -ForegroundColor Green
    
} catch {
    Write-Host "`n💥 Test suite failed: $_" -ForegroundColor Red
    Write-Host "Please fix failing tests before deployment." -ForegroundColor Yellow
    exit 1
}

# Usage examples:
# .\run-tests.ps1                    # Run all tests
# .\run-tests.ps1 -Frontend          # Run only frontend tests
# .\run-tests.ps1 -Backend           # Run only backend tests
# .\run-tests.ps1 -Coverage          # Run with coverage reports
# .\run-tests.ps1 -Watch             # Run in watch mode
# .\run-tests.ps1 -Frontend -Coverage # Frontend tests with coverage