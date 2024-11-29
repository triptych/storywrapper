# Script to automate the release process for Story Wrapper
# Usage: .\scripts\release-builder.ps1 -Version "1.0.0" -Notes "Release notes here"

param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [Parameter(Mandatory = $true)]
    [string]$Notes
)

# Ensure we're in the project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Split-Path -Parent $scriptPath)

Write-Host "Starting release process for version $Version..." -ForegroundColor Green

# Step 1: Convert icon
Write-Host "Converting icon..." -ForegroundColor Yellow
node convert-icon.js
if (-not $?) {
    Write-Host "Error: Icon conversion failed" -ForegroundColor Red
    exit 1
}

# Step 2: Build the executable
Write-Host "Building executable..." -ForegroundColor Yellow
npm run build
if (-not $?) {
    Write-Host "Error: Build failed" -ForegroundColor Red
    exit 1
}

# Step 3: Create zip file
Write-Host "Creating zip file..." -ForegroundColor Yellow
$exePath = "dist/storywrapper $Version.exe"
$zipPath = "dist/storywrapper-$Version-win-x64.zip"

if (-not (Test-Path $exePath)) {
    Write-Host "Error: Executable not found at $exePath" -ForegroundColor Red
    exit 1
}

Compress-Archive -Path $exePath -DestinationPath $zipPath -Force
if (-not $?) {
    Write-Host "Error: Zip creation failed" -ForegroundColor Red
    exit 1
}

# Step 4: Create GitHub release
Write-Host "Creating GitHub release..." -ForegroundColor Yellow
$tagName = "v$Version"
$title = "Story Wrapper v$Version"

# Check if gh CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "Error: GitHub CLI (gh) is not installed. Please install it from https://cli.github.com/" -ForegroundColor Red
    exit 1
}

# Check if authenticated with GitHub
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Not authenticated with GitHub. Please run 'gh auth login' first" -ForegroundColor Red
    exit 1
}

# Create the release
gh release create $tagName `
    --title $title `
    --notes $Notes `
    "$zipPath#Windows Portable Executable"

if ($?) {
    Write-Host "Release v$Version created successfully!" -ForegroundColor Green
}
else {
    Write-Host "Error: Failed to create release" -ForegroundColor Red
    exit 1
}
