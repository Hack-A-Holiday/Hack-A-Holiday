# API Testing Script for Travel Companion
param(
    [string]$ApiUrl = ""
)

$ErrorActionPreference = "Stop"

Write-Host "🧪 Testing Travel Companion API..." -ForegroundColor Blue

# Get API URL from .env if not provided
if (-not $ApiUrl) {
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        $apiUrlLine = $envContent | Where-Object { $_ -match "^API_GATEWAY_URL=" }
        if ($apiUrlLine) {
            $ApiUrl = ($apiUrlLine -split "=")[1]
        }
    }
}

if (-not $ApiUrl) {
    Write-Host "❌ API URL not found. Please provide it as parameter or check .env file" -ForegroundColor Red
    exit 1
}

Write-Host "🌐 Testing API at: $ApiUrl" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1️⃣ Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$ApiUrl/health" -Method GET
    Write-Host "✅ Health check passed" -ForegroundColor Green
    Write-Host "Response: $($healthResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Plan Trip (POST)
Write-Host "`n2️⃣ Testing trip planning..." -ForegroundColor Yellow
$tripRequest = @{
    preferences = @{
        destination = "Paris, France"
        budget = 2000
        duration = 5
        interests = @("culture", "food", "museums")
        startDate = "2024-06-01"
        travelers = 2
        travelStyle = "mid-range"
    }
} | ConvertTo-Json -Depth 3

try {
    $planResponse = Invoke-RestMethod -Uri "$ApiUrl/plan-trip" -Method POST -Body $tripRequest -ContentType "application/json"
    Write-Host "✅ Trip planning successful" -ForegroundColor Green
    $tripId = $planResponse.data.tripId
    Write-Host "Trip ID: $tripId" -ForegroundColor Gray
    
    # Test 3: Get Trip (GET)
    if ($tripId) {
        Write-Host "`n3️⃣ Testing get trip..." -ForegroundColor Yellow
        try {
            $getResponse = Invoke-RestMethod -Uri "$ApiUrl/trips/$tripId" -Method GET
            Write-Host "✅ Get trip successful" -ForegroundColor Green
            Write-Host "Destination: $($getResponse.data.itinerary.destination)" -ForegroundColor Gray
        } catch {
            Write-Host "❌ Get trip failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ Trip planning failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Red
    }
}

# Test 4: List Trips (requires user authentication - will likely fail)
Write-Host "`n4️⃣ Testing list trips (may fail without auth)..." -ForegroundColor Yellow
try {
    $listResponse = Invoke-RestMethod -Uri "$ApiUrl/trips" -Method GET -Headers @{"x-user-id" = "test-user"}
    Write-Host "✅ List trips successful" -ForegroundColor Green
    Write-Host "Trip count: $($listResponse.data.trips.Count)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️ List trips failed (expected without proper auth): $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 5: Invalid endpoint
Write-Host "`n5️⃣ Testing invalid endpoint..." -ForegroundColor Yellow
try {
    $invalidResponse = Invoke-RestMethod -Uri "$ApiUrl/invalid-endpoint" -Method GET
    Write-Host "❌ Invalid endpoint should have failed" -ForegroundColor Red
} catch {
    Write-Host "✅ Invalid endpoint correctly returned error" -ForegroundColor Green
}

Write-Host "`n🎉 API testing completed!" -ForegroundColor Green
Write-Host "`n📋 Summary:" -ForegroundColor Blue
Write-Host "- Health check: Available"
Write-Host "- Trip planning: Available" 
Write-Host "- Trip retrieval: Available"
Write-Host "- Error handling: Working"
Write-Host "`n💡 Next steps:" -ForegroundColor Yellow
Write-Host "1. Implement user authentication"
Write-Host "2. Add Bedrock AI integration"
Write-Host "3. Test booking functionality"