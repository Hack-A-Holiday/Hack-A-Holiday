# Test AI Agent Backend
# This script tests the AI Agent API endpoints

Write-Host "🤖 Testing AI Agent Backend..." -ForegroundColor Cyan
Write-Host ""

$backendUrl = "http://localhost:4000"

# Test 1: Health Check
Write-Host "1️⃣ Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$backendUrl/ai-agent/health" -Method GET
    Write-Host "✅ Health Check: " -ForegroundColor Green -NoNewline
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Chat Endpoint
Write-Host "2️⃣ Testing Chat Endpoint..." -ForegroundColor Yellow
$chatPayload = @{
    messages = @(
        @{
            role = "user"
            content = "Hello! Can you help me plan a trip to Tokyo?"
            timestamp = [int][double]::Parse((Get-Date -UFormat %s))
        }
    )
    userContext = @{
        sessionId = "test_session_$(Get-Date -Format 'yyyyMMddHHmmss')"
        userId = "test@example.com"
        preferences = @{
            budget = "moderate"
            travelStyle = "cultural"
        }
    }
    aiModel = "bedrock"
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/ai-agent/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $chatPayload
    Write-Host "✅ Chat Response: " -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ Chat Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

# Test 3: Recommendations Endpoint
Write-Host "3️⃣ Testing Recommendations Endpoint..." -ForegroundColor Yellow
$recommendPayload = @{
    userId = "test@example.com"
    preferences = @{
        destination = "Paris"
        budget = 2000
        duration = 5
        interests = @("museums", "food", "architecture")
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/ai-agent/recommendations" `
        -Method POST `
        -ContentType "application/json" `
        -Body $recommendPayload
    Write-Host "✅ Recommendations: " -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ Recommendations Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Analysis Endpoint
Write-Host "4️⃣ Testing Analysis Endpoint..." -ForegroundColor Yellow
$analysisPayload = @{
    userId = "test@example.com"
    conversationHistory = @(
        "I want to visit Europe",
        "I prefer cultural activities",
        "My budget is around $3000"
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/ai-agent/analysis" `
        -Method POST `
        -ContentType "application/json" `
        -Body $analysisPayload
    Write-Host "✅ Analysis: " -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ Analysis Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "🎯 Testing Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Make sure backend is running: cd backend_test && npm start"
Write-Host "2. Make sure frontend is running: cd frontend && npm run dev"
Write-Host "3. Visit http://localhost:3000/ai-agent to test the UI"
Write-Host "4. Check AI-AGENT-SETUP.md for complete documentation"
