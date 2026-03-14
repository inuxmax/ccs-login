# CCS COMPREHENSIVE TEST SUITE - Master Orchestrator (PowerShell)
# Runs all test suites in the correct order
# Maintains backward compatibility with existing usage

$ErrorActionPreference = "Continue"

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "CCS COMPREHENSIVE TEST SUITE" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "This master test suite runs:" -ForegroundColor Cyan
Write-Host "  1. Native Windows tests (PowerShell installation)" -ForegroundColor Gray
Write-Host "  2. npm package tests (if Node.js available)" -ForegroundColor Gray
Write-Host ""

# Track overall results
$OverallPass = 0
$OverallFail = 0
$OverallTotal = 0

function Test-Case {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [string]$ExpectedBehavior
    )

    $script:TotalTests++
    Write-Host ""
    Write-Host "[$script:TotalTests] $Name" -ForegroundColor Cyan
    Write-Host "    Expected: $ExpectedBehavior" -ForegroundColor Gray

    try {
        $result = & $Test
        if ($result) {
            Write-Host "    Result: PASS" -ForegroundColor Green
            $script:PassCount++
            return $true
        } else {
            Write-Host "    Result: FAIL" -ForegroundColor Red
            $script:FailCount++
            return $false
        }
    } catch {
        Write-Host "    Result: FAIL" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:FailCount++
        return $false
    }
}

# Function to run a test suite
function Run-TestSuite {
    param(
        [string]$SuiteName,
        [scriptblock]$SuiteCommand
    )

    Write-Host ""
    Write-Host "===== Running $SuiteName =====" -ForegroundColor Yellow
    Write-Host ""

    # Reset counters
    $script:PassCount = 0
    $script:FailCount = 0
    $script:TotalTests = 0

    try {
        & $SuiteCommand
        $suitePassed = $script:PassCount
        $suiteFailed = $script:FailCount
        $suiteTotal = $script:TotalTests

        Write-Host "$SuiteName completed successfully" -ForegroundColor Green
        Write-Host "Tests: $suitePassed/$suiteTotal passed" -ForegroundColor Cyan

        # Add to overall totals
        $script:OverallPass += $suitePassed
        $script:OverallFail += $suiteFailed
        $script:OverallTotal += $suiteTotal

        return $suiteFailed -eq 0
    } catch {
        Write-Host "$SuiteName failed with exception" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:OverallFail++
        return $false
    }
}

# Test Suite 1: Native Windows Tests
$WindowsTestPath = Join-Path $ScriptDir "native\windows\edge-cases.ps1"
if (Test-Path $WindowsTestPath) {
    if (Run-TestSuite "Native Windows Tests" { & $WindowsTestPath }) {
        Write-Host "✓ Native Windows tests passed" -ForegroundColor Green
    } else {
        Write-Host "⚠ Native Windows tests had failures" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ Native Windows tests not found, skipping" -ForegroundColor Yellow
}

# Test Suite 2: npm Package Tests
$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
$PackageJsonPath = Join-Path $ScriptDir "..\package.json"

if ($NodeCommand -and (Test-Path $PackageJsonPath)) {
    Write-Host ""
    Write-Host "===== Running npm Package Tests =====" -ForegroundColor Yellow
    Write-Host ""

    try {
        Push-Location (Split-Path -Parent $PackageJsonPath)
        $npmResult = npm run test:npm 2>&1
        $npmExitCode = $LASTEXITCODE
        Pop-Location

        if ($npmExitCode -eq 0) {
            Write-Host "✓ npm package tests passed" -ForegroundColor Green
            Write-Host "npm tests completed successfully" -ForegroundColor Cyan
        } else {
            Write-Host "⚠ npm package tests had failures" -ForegroundColor Yellow
            Write-Host "npm output:" -ForegroundColor Gray
            Write-Host $npmResult -ForegroundColor Gray
            $script:OverallFail++
        }
    } catch {
        Write-Host "⚠ npm package tests had errors" -ForegroundColor Yellow
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:OverallFail++
    }
} else {
    if (-not $NodeCommand) {
        Write-Host "⚠ Node.js not found, skipping npm tests" -ForegroundColor Yellow
        Write-Host "  Install Node.js to run npm package tests" -ForegroundColor Gray
    } else {
        Write-Host "⚠ package.json not found, skipping npm tests" -ForegroundColor Yellow
    }
}

# Final Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "FINAL TEST RESULTS" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

if ($OverallTotal -gt 0) {
    Write-Host "Total Tests: $OverallTotal" -ForegroundColor Cyan
    Write-Host "Passed:      $OverallPass" -ForegroundColor Green

    if ($OverallFail -eq 0) {
        Write-Host "Failed:      $OverallFail" -ForegroundColor Green
    } else {
        Write-Host "Failed:      $OverallFail" -ForegroundColor Red
    }

    $SuccessRate = if ($OverallTotal -gt 0) { [math]::Round(($OverallPass / $OverallTotal) * 100, 2) } else { 0 }
    Write-Host "Success Rate: $SuccessRate%" -ForegroundColor $(if ($SuccessRate -ge 90) { "Green" } elseif ($SuccessRate -ge 70) { "Yellow" } else { "Red" })
    Write-Host ""

    if ($OverallFail -eq 0) {
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "CCS is ready for production use!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host "SOME TESTS FAILED" -ForegroundColor Yellow
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Review failed tests above for details" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "No tests were executed" -ForegroundColor Yellow
    exit 1
}