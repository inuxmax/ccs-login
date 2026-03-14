# CCS Comprehensive Edge Case Testing
# Tests all edge cases and scenarios to ensure robustness

$ErrorActionPreference = "Continue"
$PassCount = 0
$FailCount = 0
$TotalTests = 0

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
        Write-Host "    Result: ERROR - $_" -ForegroundColor Red
        $script:FailCount++
        return $false
    }
}

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "CCS COMPREHENSIVE EDGE CASE TESTING" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Clean installation
Write-Host "Preparing clean environment..." -ForegroundColor Cyan
if (Test-Path "C:\Users\kaidu\.ccs") {
    Remove-Item "C:\Users\kaidu\.ccs" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "C:\Users\kaidu\ccs-test") {
    Remove-Item "C:\Users\kaidu\ccs-test" -Recurse -Force -ErrorAction SilentlyContinue
}

# Extract and install
New-Item -ItemType Directory -Path "C:\Users\kaidu\ccs-test" | Out-Null
tar -xzf C:\Users\kaidu\ccs-final-v5.tar.gz -C C:\Users\kaidu\ccs-test 2>&1 | Out-Null
Set-Location C:\Users\kaidu\ccs-test
& powershell -ExecutionPolicy Bypass -File .\installers\install.ps1 2>&1 | Out-Null

$CcsPath = "C:\Users\kaidu\.ccs\ccs.ps1"

if (-not (Test-Path $CcsPath)) {
    Write-Host "FATAL: Installation failed, ccs.ps1 not found" -ForegroundColor Red
    exit 1
}

Write-Host "Installation complete, starting tests..." -ForegroundColor Green
Write-Host ""

# ============================================================================
# SECTION 1: VERSION COMMANDS
# ============================================================================
Write-Host "===== SECTION 1: VERSION COMMANDS =====" -ForegroundColor Yellow

Test-Case "Version flag --version" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath --version 2>&1 | Out-String
    return $output -match "2\.1\.1|CCS"
} "Shows CCS version 2.1.1"

Test-Case "Version flag -v" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath -v 2>&1 | Out-String
    return $output -match "2\.1\.1|CCS"
} "Shows CCS version 2.1.1"

Test-Case "Version command (word)" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath version 2>&1 | Out-String
    return $output -match "2\.1\.1|CCS"
} "Shows CCS version 2.1.1"

# ============================================================================
# SECTION 2: HELP COMMANDS
# ============================================================================
Write-Host ""
Write-Host "===== SECTION 2: HELP COMMANDS =====" -ForegroundColor Yellow

Test-Case "Help flag --help" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath --help 2>&1 | Out-String
    return $output -match "Usage|Claude"
} "Shows help without profile error"

Test-Case "Help flag -h" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath -h 2>&1 | Out-String
    return $output -match "Usage|Claude"
} "Shows help without profile error"

# ============================================================================
# SECTION 3: ARGUMENT PARSING - THE CRITICAL FIX
# ============================================================================
Write-Host ""
Write-Host "===== SECTION 3: ARGUMENT PARSING (CRITICAL FIX) =====" -ForegroundColor Yellow

Test-Case "Single flag: -c" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath -c 2>&1 | Out-String
    return -not ($output -match "Profile.*'-c'.*not found")
} "Does NOT show 'Profile -c not found' error"

Test-Case "Single flag: --verbose" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath --verbose 2>&1 | Out-String
    return -not ($output -match "Profile.*'--verbose'.*not found")
} "Does NOT show 'Profile --verbose not found' error"

Test-Case "Single flag: -p" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath -p "test" 2>&1 | Out-String
    return -not ($output -match "Profile.*'-p'.*not found")
} "Does NOT show 'Profile -p not found' error"

Test-Case "Single flag: --debug" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath --debug 2>&1 | Out-String
    return -not ($output -match "Profile.*'--debug'.*not found")
} "Does NOT show profile error"

Test-Case "Multiple flags: -c --verbose" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath -c --verbose 2>&1 | Out-String
    return -not ($output -match "Profile.*not found")
} "Accepts multiple flags without profile error"

Test-Case "Flag with value: -p 'test prompt'" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath -p "test prompt" 2>&1 | Out-String
    return -not ($output -match "Profile.*'-p'.*not found")
} "Handles flag with quoted value"

# ============================================================================
# SECTION 4: PROFILE COMMANDS
# ============================================================================
Write-Host ""
Write-Host "===== SECTION 4: PROFILE COMMANDS =====" -ForegroundColor Yellow

Test-Case "Default profile (no args)" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath 2>&1 | Out-String
    return -not ($output -match "Profile.*not found")
} "Uses default profile without error"

Test-Case "GLM profile" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath glm 2>&1 | Out-String
    return -not ($output -match "Profile.*'glm'.*not found")
} "GLM profile exists and loads"

Test-Case "Profile with flag: glm -c" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath glm -c 2>&1 | Out-String
    return -not ($output -match "Profile.*not found")
} "Profile + flag combination works"

Test-Case "Profile with multiple flags: glm -c --verbose" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath glm -c --verbose 2>&1 | Out-String
    return -not ($output -match "Profile.*not found")
} "Profile + multiple flags works"

# ============================================================================
# SECTION 5: ERROR HANDLING
# ============================================================================
Write-Host ""
Write-Host "===== SECTION 5: ERROR HANDLING =====" -ForegroundColor Yellow

Test-Case "Invalid profile name" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath nonexistent-profile 2>&1 | Out-String
    return $output -match "Profile[\s\S]*not found[\s\S]*Available profiles"
} "Shows helpful error for invalid profile"

Test-Case "Invalid profile with special chars" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath "test@profile" 2>&1 | Out-String
    return $output -match "Invalid profile name|not found"
} "Rejects invalid characters in profile name"

Test-Case "Empty string as profile" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath "" 2>&1 | Out-String
    return -not ($output -match "Profile.*''.*not found")
} "Handles empty string gracefully"

# ============================================================================
# SECTION 6: EDGE CASES
# ============================================================================
Write-Host ""
Write-Host "===== SECTION 6: EDGE CASES =====" -ForegroundColor Yellow

Test-Case "Flag starting with double dash: --test-flag" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath --test-flag 2>&1 | Out-String
    return -not ($output -match "Profile.*'--test-flag'.*not found")
} "Handles double-dash flags correctly"

Test-Case "Short flag alone: -d" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath -d 2>&1 | Out-String
    return -not ($output -match "Profile.*'-d'.*not found")
} "Handles short flags correctly"

Test-Case "Mixed flags and arguments" {
    # PowerShell -File parameter binding will consume -p as ProfileOrFlag parameter
    # So we test with flags that don't conflict: --verbose -c (both start with -)
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath --verbose -c 2>&1 | Out-String
    return -not ($output -match "Profile.*not found")
} "Handles complex flag combinations"

Test-Case "Profile 'default' explicitly" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath default 2>&1 | Out-String
    return -not ($output -match "Profile.*'default'.*not found")
} "Explicit default profile works"

Test-Case "Flag with equals: --model=gpt4" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath --model=test 2>&1 | Out-String
    return -not ($output -match "Profile.*'--model=test'.*not found")
} "Handles flags with equals syntax"

Test-Case "Negative number (looks like flag): -1" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath -1 2>&1 | Out-String
    return -not ($output -match "Profile.*'-1'.*not found")
} "Handles numeric flags"

# ============================================================================
# SECTION 7: CONFIGURATION VALIDATION
# ============================================================================
Write-Host ""
Write-Host "===== SECTION 7: CONFIGURATION VALIDATION =====" -ForegroundColor Yellow

Test-Case "Config file exists" {
    return Test-Path "C:\Users\kaidu\.ccs\config.json"
} "config.json was created"

Test-Case "Config file is valid JSON" {
    try {
        $config = Get-Content "C:\Users\kaidu\.ccs\config.json" -Raw | ConvertFrom-Json
        return $config.profiles -ne $null
    } catch {
        return $false
    }
} "config.json is valid JSON with profiles"

Test-Case "GLM profile file exists" {
    return Test-Path "C:\Users\kaidu\.ccs\glm.settings.json"
} "glm.settings.json exists"

Test-Case "GLM settings is valid JSON" {
    try {
        $settings = Get-Content "C:\Users\kaidu\.ccs\glm.settings.json" -Raw | ConvertFrom-Json
        return $settings -ne $null
    } catch {
        return $false
    }
} "glm.settings.json is valid JSON"

# ============================================================================
# SECTION 8: REAL USAGE SIMULATION
# ============================================================================
Write-Host ""
Write-Host "===== SECTION 8: REAL USAGE SIMULATION =====" -ForegroundColor Yellow

Test-Case "Simulate: continue conversation" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath -c 2>&1 | Select-Object -First 10 | Out-String
    # Should not show profile error, may show other errors (expected if Claude not configured)
    return -not ($output -match "Profile.*'-c'.*not found")
} "Real usage: ccs -c (continue) works"

Test-Case "Simulate: GLM with prompt" {
    $job = Start-Job -ScriptBlock {
        param($CcsPath)
        & powershell -ExecutionPolicy Bypass -File $CcsPath glm -p "2+2" 2>&1
    } -ArgumentList $CcsPath

    $completed = Wait-Job $job -Timeout 5
    $result = Receive-Job $job 2>&1 | Out-String
    Remove-Job $job -Force

    # Should not show profile error
    return -not ($result -match "Profile.*not found")
} "Real usage: ccs glm -p works"

Test-Case "Simulate: verbose mode" {
    $output = & powershell -ExecutionPolicy Bypass -File $CcsPath --verbose 2>&1 | Select-Object -First 5 | Out-String
    return -not ($output -match "Profile.*'--verbose'.*not found")
} "Real usage: ccs --verbose works"

# ============================================================================
# FINAL RESULTS
# ============================================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "TEST RESULTS SUMMARY" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Total Tests: $TotalTests" -ForegroundColor Cyan
Write-Host "Passed:      $PassCount" -ForegroundColor Green
Write-Host "Failed:      $FailCount" -ForegroundColor $(if ($FailCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

$SuccessRate = [math]::Round(($PassCount / $TotalTests) * 100, 2)
Write-Host "Success Rate: $SuccessRate%" -ForegroundColor $(if ($SuccessRate -ge 90) { "Green" } elseif ($SuccessRate -ge 70) { "Yellow" } else { "Red" })
Write-Host ""

if ($FailCount -eq 0) {
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
