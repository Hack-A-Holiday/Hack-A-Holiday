# Quick fix script for frontend dependencies
Write-Host "🔧 Fixing frontend dependencies..." -ForegroundColor Yellow

# Navigate to frontend directory
Set-Location frontend

# Clear npm cache and node_modules
Write-Host "Clearing cache and node_modules..." -ForegroundColor Gray
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules
}
if (Test-Path "package-lock.json") {
    Remove-Item package-lock.json
}

# Clear npm cache
npm cache clean --force

# Install dependencies with latest compatible versions
Write-Host "Installing dependencies..." -ForegroundColor Gray
npm install

# Verify installation
Write-Host "Verifying installation..." -ForegroundColor Gray
if (Test-Path "node_modules/next") {
    Write-Host "✅ Next.js installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Next.js installation failed" -ForegroundColor Red
}

if (Test-Path "node_modules/typescript") {
    Write-Host "✅ TypeScript installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ TypeScript installation failed" -ForegroundColor Red
}

# Go back to root
Set-Location ..

Write-Host "🎉 Frontend fix completed!" -ForegroundColor Green
Write-Host "Now try: cd frontend && npm run dev" -ForegroundColor Cyan