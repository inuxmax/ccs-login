#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Test suite for CCS --install functionality (Windows PowerShell)

.DESCRIPTION
    Tests the --install flag for CCS executable on Windows PowerShell.
    Tests against actual system installation for simplicity.

.NOTES
    Author: CCS Test Suite
    Version: 1.0
    Based on: edge-cases.ps1 patterns
#>

#Requires -Version 5.1

# Don't exit on errors, we're testing
$ErrorActionPreference = "Continue"

# Test statistics
$Script:TotalTests = 0
$Script:PassedTests = 0
$Script:FailedTests = 0

# Colors
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Cyan = "Cyan"
    White = "White"
}

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Test-Case {
    param(
        [string]$Name,
        [string]$Description,
        [scriptblock]$TestCode
    )

    $Script:TotalTests++
    Write-Host ""
    Write-ColorOutput "[$Script:TotalTests] $Name" "Cyan"
    Write-ColorOutput "    Expected: $Description" "White"

    try {
        if (& $TestCode) {
            Write-ColorOutput "    Result: PASS" "Green"
            $Script:PassedTests++
            return $true
        } else {
            Write-ColorOutput "    Result: FAIL" "Red"
            $Script:FailedTests++
            return $false
        }
    }
    catch {
        Write-ColorOutput "    Result: FAIL" "Red"
        Write-ColorOutput "    Error: $($_.Exception.Message)" "Red"
        $Script:FailedTests++
        return $false
    }
}

Write-ColorOutput "========================================" "Yellow"
Write-ColorOutput "CCS --INSTALL FUNCTIONALITY TESTING" "Yellow"
Write-ColorOutput "========================================" "Yellow"
Write-Host ""

# Get script paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CcsRoot = Split-Path -Parent $ScriptDir
$CcsPath = Join-Path $CcsRoot "ccs.ps1"

# Backup existing .claude directory
Write-ColorOutput "Safety: Backing up existing ~/.claude/..." "Cyan"
$BackupDir = Join-Path $env:TEMP "ccs-test-backup-$(Get-Date -Format 'yyyyMMddHHmmss')"
if (Test-Path $env:USERPROFILE\.claude) {
    Write-Host "  Found existing ~/.claude/, creating backup at $BackupDir"
    Copy-Item -Path $env:USERPROFILE\.claude -Destination $BackupDir -Recurse -Force
    Write-ColorOutput "  Backup created successfully" "Green"
} else {
    Write-ColorOutput "  No existing ~/.claude/ found" "Yellow"
}
Write-Host ""

# ============================================================================
# PRE-CHECKS
# ============================================================================
Write-ColorOutput "===== PRE-CHECKS =====" "Yellow"

Test-Case "CCS executable exists" "ccs.ps1 script found" {
    Test-Path $CcsPath
}

Test-Case "Source .claude directory exists" ".claude/ in CCS repo" {
    Test-Path (Join-Path $CcsRoot ".claude")
}

Test-Case "Source commands exist" "ccs.md command file exists" {
    Test-Path (Join-Path $CcsRoot ".claude\commands\ccs.md")
}

Test-Case "Source skills exist" "ccs-delegation skill directory exists" {
    Test-Path (Join-Path $CcsRoot ".claude\skills\ccs-delegation")
}

# ============================================================================
# SECTION 1: INSTALLATION
# ============================================================================
Write-Host ""
Write-ColorOutput "===== SECTION 1: INSTALLATION =====" "Yellow"

Test-Case "Install: Command executes without error" "Exit code 0" {
    $process = Start-Process -FilePath "pwsh" -ArgumentList "-File", "`"$CcsPath`"", "--install" -Wait -PassThru -NoNewWindow
    $process.ExitCode -eq 0
}

Test-Case "Install: Commands directory created" "~/.claude/commands/ exists" {
    Test-Path "$env:USERPROFILE\.claude\commands"
}

Test-Case "Install: Skills directory created" "~/.claude/skills/ exists" {
    Test-Path "$env:USERPROFILE\.claude\skills"
}

Test-Case "Install: ccs.md command installed" "ccs.md file exists" {
    Test-Path "$env:USERPROFILE\.claude\commands\ccs.md"
}

Test-Case "Install: ccs-delegation skill installed" "ccs-delegation/ exists" {
    Test-Path "$env:USERPROFILE\.claude\skills\ccs-delegation"
}

Test-Case "Install: SKILL.md exists" "SKILL.md in ccs-delegation/" {
    Test-Path "$env:USERPROFILE\.claude\skills\ccs-delegation\SKILL.md"
}

Test-Case "Install: references directory exists" "references/ subdirectory present" {
    Test-Path "$env:USERPROFILE\.claude\skills\ccs-delegation\references"
}

# ============================================================================
# SECTION 2: IDEMPOTENCY
# ============================================================================
Write-Host ""
Write-ColorOutput "===== SECTION 2: IDEMPOTENCY =====" "Yellow"

Test-Case "Idempotent: Second run succeeds" "Second --install doesn't error" {
    $process = Start-Process -FilePath "pwsh" -ArgumentList "-File", "`"$CcsPath`"", "--install" -Wait -PassThru -NoNewWindow
    $process.ExitCode -eq 0
}

# ============================================================================
# SECTION 3: FILE INTEGRITY
# ============================================================================
Write-Host ""
Write-ColorOutput "===== SECTION 3: FILE INTEGRITY =====" "Yellow"

Test-Case "Integrity: Command file not empty" "ccs.md has content" {
    $content = Get-Content "$env:USERPROFILE\.claude\commands\ccs.md" -Raw
    $content.Length -gt 0
}

Test-Case "Integrity: Skill file not empty" "SKILL.md has content" {
    $content = Get-Content "$env:USERPROFILE\.claude\skills\ccs-delegation\SKILL.md" -Raw
    $content.Length -gt 0
}

Test-Case "Integrity: Command file matches source" "ccs.md content identical" {
    $source = Get-Content (Join-Path $CcsRoot ".claude\commands\ccs.md") -Raw
    $target = Get-Content "$env:USERPROFILE\.claude\commands\ccs.md" -Raw
    $source -eq $target
}

Test-Case "Integrity: Skill file matches source" "SKILL.md content identical" {
    $source = Get-Content (Join-Path $CcsRoot ".claude\skills\ccs-delegation\SKILL.md") -Raw
    $target = Get-Content "$env:USERPROFILE\.claude\skills\ccs-delegation\SKILL.md" -Raw
    $source -eq $target
}

# ============================================================================
# SECTION 4: INTEGRATION
# ============================================================================
Write-Host ""
Write-ColorOutput "===== SECTION 4: INTEGRATION WITH CCS =====" "Yellow"

Test-Case "Integration: --install executes without profile error" "No profile error on --install" {
    $process = Start-Process -FilePath "pwsh" -ArgumentList "-File", "`"$CcsPath`"", "--install" -Wait -PassThru -NoNewWindow
    $process.ExitCode -eq 0
}

Test-Case "Integration: --version still works" "Version command exits successfully" {
    $process = Start-Process -FilePath "pwsh" -ArgumentList "-File", "`"$CcsPath`"", "--version" -Wait -PassThru -NoNewWindow
    $process.ExitCode -eq 0
}

Test-Case "Integration: --help still works" "Help command exits successfully" {
    $process = Start-Process -FilePath "pwsh" -ArgumentList "-File", "`"$CcsPath`"", "--help" -Wait -PassThru -NoNewWindow
    $process.ExitCode -eq 0
}

# ============================================================================
# FINAL RESULTS
# ============================================================================
Write-Host ""
Write-ColorOutput "========================================" "Yellow"
Write-ColorOutput "TEST RESULTS SUMMARY" "Yellow"
Write-ColorOutput "========================================" "Yellow"
Write-Host ""

Write-ColorOutput "Total Tests: $Script:TotalTests" "Cyan"
Write-ColorOutput "Passed:      $Script:PassedTests" "Green"
if ($Script:FailedTests -eq 0) {
    Write-ColorOutput "Failed:      $Script:FailedTests" "Green"
} else {
    Write-ColorOutput "Failed:      $Script:FailedTests" "Red"
}
Write-Host ""

$SuccessRate = if ($Script:TotalTests -gt 0) {
    [math]::Round(($Script:PassedTests / $Script:TotalTests) * 100, 2)
} else { 0 }

if ($SuccessRate -ge 90) {
    Write-ColorOutput "Success Rate: $SuccessRate%" "Green"
} elseif ($SuccessRate -ge 70) {
    Write-ColorOutput "Success Rate: $SuccessRate%" "Yellow"
} else {
    Write-ColorOutput "Success Rate: $SuccessRate%" "Red"
}

Write-Host ""

if ($Script:FailedTests -eq 0) {
    Write-ColorOutput "========================================" "Green"
    Write-ColorOutput "ALL TESTS PASSED!" "Green"
    Write-ColorOutput "========================================" "Green"
    Write-ColorOutput "--install functionality is production ready!" "Green"
} else {
    Write-ColorOutput "========================================" "Red"
    Write-ColorOutput "SOME TESTS FAILED" "Red"
    Write-ColorOutput "========================================" "Red"
    Write-ColorOutput "Review failed tests above for details" "Red"
}

# Restore backup
Write-Host ""
Write-ColorOutput "Cleaning up and restoring..." "Yellow"
if (Test-Path $env:USERPROFILE\.claude) {
    Write-Host "  Removing test data from $env:USERPROFILE\.claude"
    Remove-Item -Path $env:USERPROFILE\.claude -Recurse -Force
}

if (Test-Path $BackupDir) {
    Write-Host "  Restoring backup from $BackupDir"
    Move-Item -Path $BackupDir -Destination $env:USERPROFILE\.claude
    Write-ColorOutput "  Backup restored successfully" "Green"
}

# Exit with appropriate code
if ($Script:FailedTests -gt 0) {
    exit 1
} else {
    exit 0
}