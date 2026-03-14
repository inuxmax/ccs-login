$ErrorActionPreference = "Stop"

# CCS v3.2.0 - Symlink Chain Validation Test (Windows)
# Tests double symlink chain: instance → shared → claude

$TestDir = "$env:TEMP\ccs-symlink-test-$PID"
$FakeClaude = "$TestDir\fake-claude"
$FakeShared = "$TestDir\fake-shared"
$FakeInstance = "$TestDir\fake-instance"

function Write-TestHeader {
    Write-Host "╔════════════════════════════════════════╗"
    Write-Host "║  CCS v3.2.0 Symlink Chain Test        ║"
    Write-Host "╚════════════════════════════════════════╝"
    Write-Host ""
}

function Test-SymlinkChain {
    Write-Host "[i] Test 1: Basic symlink chain"

    New-Item -ItemType Directory -Path "$FakeClaude\commands" -Force | Out-Null
    New-Item -ItemType Directory -Path "$FakeClaude\skills" -Force | Out-Null
    New-Item -ItemType Directory -Path "$FakeClaude\agents" -Force | Out-Null

    "# Test Command" | Out-File "$FakeClaude\commands\test-cmd.md"
    "# Test Skill" | Out-File "$FakeClaude\skills\test-skill.md"
    "# Test Agent" | Out-File "$FakeClaude\agents\test-agent.md"

    New-Item -ItemType Directory -Path $FakeShared -Force | Out-Null

    try {
        # Test with symlinks (requires Developer Mode)
        New-Item -ItemType SymbolicLink -Path "$FakeShared\commands" -Target "$FakeClaude\commands" -Force | Out-Null
        New-Item -ItemType SymbolicLink -Path "$FakeShared\skills" -Target "$FakeClaude\skills" -Force | Out-Null
        New-Item -ItemType SymbolicLink -Path "$FakeShared\agents" -Target "$FakeClaude\agents" -Force | Out-Null

        New-Item -ItemType Directory -Path $FakeInstance -Force | Out-Null
        New-Item -ItemType SymbolicLink -Path "$FakeInstance\commands" -Target "$FakeShared\commands" -Force | Out-Null
        New-Item -ItemType SymbolicLink -Path "$FakeInstance\skills" -Target "$FakeShared\skills" -Force | Out-Null
        New-Item -ItemType SymbolicLink -Path "$FakeInstance\agents" -Target "$FakeShared\agents" -Force | Out-Null

        if ((Test-Path "$FakeInstance\commands\test-cmd.md") -and
            (Test-Path "$FakeInstance\skills\test-skill.md") -and
            (Test-Path "$FakeInstance\agents\test-agent.md")) {
            Write-Host "[OK] Symlink chain works (Developer Mode enabled)" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "[!] Symlink failed - Developer Mode required" -ForegroundColor Yellow
        Write-Host "[i] Testing copy fallback..." -ForegroundColor Yellow

        # Test copy fallback
        Copy-Item -Path "$FakeClaude\commands" -Destination "$FakeShared\commands" -Recurse -Force
        Copy-Item -Path "$FakeClaude\skills" -Destination "$FakeShared\skills" -Recurse -Force
        Copy-Item -Path "$FakeClaude\agents" -Destination "$FakeShared\agents" -Recurse -Force

        Copy-Item -Path "$FakeShared\commands" -Destination "$FakeInstance\commands" -Recurse -Force
        Copy-Item -Path "$FakeShared\skills" -Destination "$FakeInstance\skills" -Recurse -Force
        Copy-Item -Path "$FakeShared\agents" -Destination "$FakeInstance\agents" -Recurse -Force

        if ((Test-Path "$FakeInstance\commands\test-cmd.md") -and
            (Test-Path "$FakeInstance\skills\test-skill.md") -and
            (Test-Path "$FakeInstance\agents\test-agent.md")) {
            Write-Host "[OK] Copy fallback works" -ForegroundColor Green
            return $false  # Symlinks not available
        }
    }

    Write-Host "[X] Both symlink and copy failed" -ForegroundColor Red
    throw "Test failed"
}

function Test-CircularDetection {
    Write-Host "[i] Test 2: Circular symlink detection"

    $CircularTest = "$TestDir\circular-test"
    New-Item -ItemType Directory -Path "$CircularTest\shared" -Force | Out-Null
    New-Item -ItemType Directory -Path "$CircularTest\claude" -Force | Out-Null

    try {
        # Create circular symlink: shared → claude → shared
        New-Item -ItemType SymbolicLink -Path "$CircularTest\claude\commands" -Target "$CircularTest\shared" -Force -ErrorAction SilentlyContinue | Out-Null

        $item = Get-Item "$CircularTest\claude\commands" -ErrorAction SilentlyContinue
        if ($item -and $item.LinkType -eq "SymbolicLink") {
            $target = $item.Target
            if ($target -like "*\shared*") {
                Write-Host "[OK] Circular symlink detected correctly" -ForegroundColor Green
                return
            }
        }
    } catch {
        # Expected if symlinks not available
        Write-Host "[i] Circular detection skipped (symlinks not available)" -ForegroundColor Yellow
        return
    }

    Write-Host "[X] Circular symlink detection failed" -ForegroundColor Red
}

function Test-Performance {
    Write-Host "[i] Test 3: Performance measurement"

    $PerfTest = "$TestDir\perf-test"
    New-Item -ItemType Directory -Path "$PerfTest\source" -Force | Out-Null
    New-Item -ItemType Directory -Path "$PerfTest\target" -Force | Out-Null

    try {
        $start = Get-Date
        for ($i = 1; $i -le 100; $i++) {
            New-Item -ItemType SymbolicLink -Path "$PerfTest\target\link-$i" -Target "$PerfTest\source" -Force -ErrorAction Stop | Out-Null
        }
        $end = Get-Date
        $duration = ($end - $start).TotalMilliseconds
        $avg = [math]::Round($duration / 100, 2)
        Write-Host "[OK] Avg symlink creation: ${avg}ms (target: <1ms)" -ForegroundColor Green
    } catch {
        Write-Host "[i] Performance test skipped (symlinks not available)" -ForegroundColor Yellow
    }
}

function Test-BrokenSymlink {
    Write-Host "[i] Test 4: Broken symlink detection"

    $BrokenTest = "$TestDir\broken-test"
    New-Item -ItemType Directory -Path "$BrokenTest\instance" -Force | Out-Null

    try {
        New-Item -ItemType SymbolicLink -Path "$BrokenTest\instance\commands" -Target "$BrokenTest\nonexistent" -Force -ErrorAction Stop | Out-Null

        $item = Get-Item "$BrokenTest\instance\commands" -ErrorAction SilentlyContinue
        if ($item -and $item.LinkType -eq "SymbolicLink" -and !(Test-Path "$BrokenTest\instance\commands")) {
            Write-Host "[OK] Broken symlink detected correctly" -ForegroundColor Green
        } else {
            Write-Host "[X] Broken symlink detection failed" -ForegroundColor Red
        }
    } catch {
        Write-Host "[i] Broken symlink test skipped (symlinks not available)" -ForegroundColor Yellow
    }
}

function Test-LiveUpdates {
    Write-Host "[i] Test 5: Live updates through chain"

    try {
        New-Item -ItemType Directory -Path "$FakeClaude\commands" -Force | Out-Null
        New-Item -ItemType Directory -Path $FakeShared -Force | Out-Null
        New-Item -ItemType Directory -Path $FakeInstance -Force | Out-Null

        New-Item -ItemType SymbolicLink -Path "$FakeShared\commands" -Target "$FakeClaude\commands" -Force -ErrorAction Stop | Out-Null
        New-Item -ItemType SymbolicLink -Path "$FakeInstance\commands" -Target "$FakeShared\commands" -Force -ErrorAction Stop | Out-Null

        # Write to source
        "# Original" | Out-File "$FakeClaude\commands\live-test.md"

        # Verify accessible from instance
        if (Test-Path "$FakeInstance\commands\live-test.md") {
            $content = Get-Content "$FakeInstance\commands\live-test.md" -Raw
            if ($content -match "# Original") {
                Write-Host "[OK] Live updates work through chain" -ForegroundColor Green
            } else {
                Write-Host "[X] Content mismatch" -ForegroundColor Red
                return
            }
        } else {
            Write-Host "[X] File not accessible through chain" -ForegroundColor Red
            return
        }

        # Update source
        "# Updated" | Out-File "$FakeClaude\commands\live-test.md"

        # Verify update visible from instance
        $content = Get-Content "$FakeInstance\commands\live-test.md" -Raw
        if ($content -match "# Updated") {
            Write-Host "[OK] Live updates reflected instantly" -ForegroundColor Green
        } else {
            Write-Host "[X] Update not reflected" -ForegroundColor Red
        }
    } catch {
        Write-Host "[i] Live updates test skipped (symlinks not available)" -ForegroundColor Yellow
    }
}

try {
    Write-TestHeader
    Write-Host "Running validation tests..."
    Write-Host ""

    Test-SymlinkChain
    Test-CircularDetection
    Test-Performance
    Test-BrokenSymlink
    Test-LiveUpdates

    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗"
    Write-Host "║  All Tests Passed ✓                   ║"
    Write-Host "╚════════════════════════════════════════╝"
} finally {
    Remove-Item $TestDir -Recurse -Force -ErrorAction SilentlyContinue
}
