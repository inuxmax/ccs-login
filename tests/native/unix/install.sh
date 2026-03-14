#!/usr/bin/env bash
# CCS --install Functionality Testing (Linux/macOS)
# Comprehensive tests for the --install command

set +e  # Don't exit on errors, we're testing
PASS_COUNT=0
FAIL_COUNT=0
TOTAL_TESTS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CCS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CCS_PATH="$CCS_ROOT/ccs"

# Backup/restore paths
CLAUDE_DIR="$HOME/.claude"
BACKUP_DIR="/tmp/ccs-test-backup-$(date +%s)"
TEST_HOME="/tmp/ccs-test-home"
TEST_CLAUDE_DIR="$TEST_HOME/.claude"

test_case() {
    local name="$1"
    local expected="$2"
    shift 2

    ((TOTAL_TESTS++))
    echo ""
    echo -e "${CYAN}[$TOTAL_TESTS] $name${NC}"
    echo -e "${GRAY}    Expected: $expected${NC}"

    if "$@"; then
        echo -e "${GREEN}    Result: PASS${NC}"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}    Result: FAIL${NC}"
        ((FAIL_COUNT++))
        return 1
    fi
}

cleanup_and_restore() {
    echo ""
    echo -e "${YELLOW}Cleaning up and restoring...${NC}"

    # Remove test directory
    rm -rf "$TEST_HOME"

    # Restore backup if it exists
    if [[ -d "$BACKUP_DIR" ]]; then
        if [[ -d "$CLAUDE_DIR" ]]; then
            echo "  Removing test data from $CLAUDE_DIR"
            rm -rf "$CLAUDE_DIR"
        fi
        echo "  Restoring backup from $BACKUP_DIR"
        mv "$BACKUP_DIR" "$CLAUDE_DIR"
        echo -e "${GREEN}  Backup restored successfully${NC}"
    fi
}

# Trap to ensure cleanup happens even if script fails
trap cleanup_and_restore EXIT

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}CCS --INSTALL FUNCTIONALITY TESTING${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# ============================================================================
# SAFETY: BACKUP EXISTING ~/.claude/
# ============================================================================
echo -e "${CYAN}Safety: Backing up existing ~/.claude/...${NC}"

if [[ -d "$CLAUDE_DIR" ]]; then
    echo "  Found existing ~/.claude/, creating backup at $BACKUP_DIR"
    cp -r "$CLAUDE_DIR" "$BACKUP_DIR"
    echo -e "${GREEN}  Backup created successfully${NC}"
else
    echo "  No existing ~/.claude/ found, no backup needed"
fi

echo ""

# ============================================================================
# PRE-CHECKS
# ============================================================================
echo -e "${YELLOW}===== PRE-CHECKS =====${NC}"

test_case "CCS executable exists" "ccs script found at $CCS_PATH" bash -c "
    [[ -f '$CCS_PATH' ]]
"

test_case "CCS executable is executable" "ccs has execute permissions" bash -c "
    [[ -x '$CCS_PATH' ]]
"

test_case "Source .claude directory exists" ".claude/ in CCS repo" bash -c "
    [[ -d '$CCS_ROOT/.claude' ]]
"

test_case "Source commands exist" "ccs.md command file exists" bash -c "
    [[ -f '$CCS_ROOT/.claude/commands/ccs.md' ]]
"

test_case "Source skills exist" "ccs-delegation skill directory exists" bash -c "
    [[ -d '$CCS_ROOT/.claude/skills/ccs-delegation' ]]
"

# ============================================================================
# SECTION 1: FRESH INSTALLATION (NO ~/.claude/)
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 1: FRESH INSTALLATION =====${NC}"

# Clean any existing test directory
rm -rf "$TEST_HOME"
mkdir -p "$TEST_HOME"

test_case "Fresh install: Command executes without error" "Exit code 0" bash -c "
    HOME='$TEST_HOME' '$CCS_PATH' --install > /tmp/ccs-install-output.txt 2>&1
"

test_case "Fresh install: Commands directory created" "~/.claude/commands/ exists" bash -c "
    [[ -d '$TEST_CLAUDE_DIR/commands' ]]
"

test_case "Fresh install: Skills directory created" "~/.claude/skills/ exists" bash -c "
    [[ -d '$TEST_CLAUDE_DIR/skills' ]]
"

test_case "Fresh install: ccs.md command installed" "ccs.md file exists in commands/" bash -c "
    [[ -f '$TEST_CLAUDE_DIR/commands/ccs.md' ]]
"

test_case "Fresh install: ccs-delegation skill installed" "ccs-delegation/ exists in skills/" bash -c "
    [[ -d '$TEST_CLAUDE_DIR/skills/ccs-delegation' ]]
"

test_case "Fresh install: SKILL.md exists" "SKILL.md in ccs-delegation/" bash -c "
    [[ -f '$TEST_CLAUDE_DIR/skills/ccs-delegation/SKILL.md' ]]
"

test_case "Fresh install: references directory exists" "references/ subdirectory present" bash -c "
    [[ -d '$TEST_CLAUDE_DIR/skills/ccs-delegation/references' ]]
"

test_case "Fresh install: delegation-patterns.md exists" "Pattern reference file present" bash -c "
    [[ -f '$TEST_CLAUDE_DIR/skills/ccs-delegation/references/delegation-patterns.md' ]]
"

# ============================================================================
# SECTION 2: OUTPUT FORMATTING (BOX-DRAWING CHARACTERS)
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 2: OUTPUT FORMATTING =====${NC}"

# Clean for fresh test
rm -rf "$TEST_HOME"
mkdir -p "$TEST_HOME"

test_case "Output: Contains box-drawing header" "Output has ┌─" bash -c "
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1)
    [[ \$output =~ ┌─ ]]
"

test_case "Output: Contains box-drawing footer" "Output has └─" bash -c "
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1)
    [[ \$output =~ └─ ]]
"

test_case "Output: Contains pipe for indentation" "Output has │" bash -c "
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1)
    [[ \$output =~ │ ]]
"

test_case "Output: Contains checkmark indicator" "Output has ✓" bash -c "
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1)
    [[ \$output =~ ✓ ]]
"

test_case "Output: Shows source directory" "Output includes source path" bash -c "
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1)
    [[ \$output =~ Source: ]]
"

test_case "Output: Shows target directory" "Output includes target path" bash -c "
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1)
    [[ \$output =~ Target: ]]
"

test_case "Output: Shows installation complete message" "Success message present" bash -c "
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1)
    [[ \$output =~ 'Installation complete' ]]
"

test_case "Output: Shows installed count" "Displays number of installed items" bash -c "
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1)
    [[ \$output =~ 'Installed:' ]]
"

test_case "Output: NO emoji characters used" "Output uses only box-drawing and symbols" bash -c "
    # Check for actual emoji characters (not box-drawing or symbols like ✓ ℹ ✗)
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1)
    ! [[ \$output =~ [🚀📋🎯🎉] ]]
"

# ============================================================================
# SECTION 3: IDEMPOTENCY (MULTIPLE RUNS)
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 3: IDEMPOTENCY =====${NC}"

# Start fresh
rm -rf "$TEST_HOME"
mkdir -p "$TEST_HOME"
HOME="$TEST_HOME" "$CCS_PATH" --install > /dev/null 2>&1

test_case "Idempotent: Second run succeeds" "Second --install doesn't error" bash -c "
    HOME='$TEST_HOME' '$CCS_PATH' --install > /tmp/ccs-install-second.txt 2>&1
"

test_case "Idempotent: Shows skip messages" "Output contains 'Skipping existing'" bash -c "
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1)
    [[ \$output =~ 'Skipping existing' ]]
"

test_case "Idempotent: Uses info indicator ℹ" "Skip messages have ℹ indicator" bash -c "
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1)
    [[ \$output =~ ℹ ]]
"

test_case "Idempotent: Skipped count shown" "Displays number of skipped items" bash -c "
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1)
    [[ \$output =~ 'Skipped:' ]]
"

test_case "Idempotent: Files remain unchanged" "Original files not modified" bash -c "
    # Get modification time before second install
    mtime1=\$(stat -c %Y '$TEST_CLAUDE_DIR/commands/ccs.md' 2>/dev/null || stat -f %m '$TEST_CLAUDE_DIR/commands/ccs.md')
    sleep 1
    HOME='$TEST_HOME' '$CCS_PATH' --install > /dev/null 2>&1
    mtime2=\$(stat -c %Y '$TEST_CLAUDE_DIR/commands/ccs.md' 2>/dev/null || stat -f %m '$TEST_CLAUDE_DIR/commands/ccs.md')
    [[ \$mtime1 == \$mtime2 ]]
"

test_case "Idempotent: Third run still safe" "Multiple runs are safe" bash -c "
    HOME='$TEST_HOME' '$CCS_PATH' --install > /dev/null 2>&1
    HOME='$TEST_HOME' '$CCS_PATH' --install > /dev/null 2>&1
    [[ -f '$TEST_CLAUDE_DIR/commands/ccs.md' ]] && [[ -d '$TEST_CLAUDE_DIR/skills/ccs-delegation' ]]
"

# ============================================================================
# SECTION 4: CONFLICT HANDLING (EXISTING FILES)
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 4: CONFLICT HANDLING =====${NC}"

# Create existing files with different content
rm -rf "$TEST_CLAUDE_DIR"
mkdir -p "$TEST_CLAUDE_DIR/commands"
mkdir -p "$TEST_CLAUDE_DIR/skills/ccs-delegation"
echo "EXISTING COMMAND CONTENT" > "$TEST_CLAUDE_DIR/commands/ccs.md"
echo "EXISTING SKILL CONTENT" > "$TEST_CLAUDE_DIR/skills/ccs-delegation/SKILL.md"

test_case "Conflict: Skips existing command file" "Doesn't overwrite ccs.md" bash -c "
    HOME='$TEST_HOME' '$CCS_PATH' --install > /dev/null 2>&1
    content=\$(cat '$TEST_CLAUDE_DIR/commands/ccs.md')
    [[ \$content == 'EXISTING COMMAND CONTENT' ]]
"

test_case "Conflict: Skips existing skill directory" "Doesn't overwrite skill" bash -c "
    content=\$(cat '$TEST_CLAUDE_DIR/skills/ccs-delegation/SKILL.md')
    [[ \$content == 'EXISTING SKILL CONTENT' ]]
"

test_case "Conflict: Output shows skip message" "User informed about skips" bash -c "
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1)
    [[ \$output =~ 'Skipping existing command: ccs.md' ]]
"

test_case "Conflict: No data loss" "Original files preserved" bash -c "
    [[ -f '$TEST_CLAUDE_DIR/commands/ccs.md' ]] &&
    grep -q 'EXISTING COMMAND CONTENT' '$TEST_CLAUDE_DIR/commands/ccs.md'
"

# ============================================================================
# SECTION 5: FILE INTEGRITY
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 5: FILE INTEGRITY =====${NC}"

# Fresh install for integrity checks
rm -rf "$TEST_HOME"
mkdir -p "$TEST_HOME"
HOME="$TEST_HOME" "$CCS_PATH" --install > /dev/null 2>&1

test_case "Integrity: Command file not empty" "ccs.md has content" bash -c "
    [[ -s '$TEST_CLAUDE_DIR/commands/ccs.md' ]]
"

test_case "Integrity: Skill file not empty" "SKILL.md has content" bash -c "
    [[ -s '$TEST_CLAUDE_DIR/skills/ccs-delegation/SKILL.md' ]]
"

test_case "Integrity: Command file matches source" "ccs.md content identical" bash -c "
    diff -q '$CCS_ROOT/.claude/commands/ccs.md' '$TEST_CLAUDE_DIR/commands/ccs.md'
"

test_case "Integrity: Skill file matches source" "SKILL.md content identical" bash -c "
    diff -q '$CCS_ROOT/.claude/skills/ccs-delegation/SKILL.md' '$TEST_CLAUDE_DIR/skills/ccs-delegation/SKILL.md'
"

test_case "Integrity: Reference file matches source" "delegation-patterns.md identical" bash -c "
    diff -q '$CCS_ROOT/.claude/skills/ccs-delegation/references/delegation-patterns.md' \
            '$TEST_CLAUDE_DIR/skills/ccs-delegation/references/delegation-patterns.md'
"

test_case "Integrity: Directory structure preserved" "All subdirectories present" bash -c "
    [[ -d '$TEST_CLAUDE_DIR/skills/ccs-delegation/references' ]]
"

# ============================================================================
# SECTION 6: ERROR HANDLING
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 6: ERROR HANDLING =====${NC}"

test_case "Error: Missing source directory handled" "Graceful error when source missing" bash -c "
    # Temporarily move .claude directory
    mv '$CCS_ROOT/.claude' '$CCS_ROOT/.claude.backup'
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1 || true)
    mv '$CCS_ROOT/.claude.backup' '$CCS_ROOT/.claude'
    [[ \$output =~ 'Error: Source directory not found' ]]
"

test_case "Error: Shows helpful error message" "Error message explains the issue" bash -c "
    mv '$CCS_ROOT/.claude' '$CCS_ROOT/.claude.backup'
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1 || true)
    mv '$CCS_ROOT/.claude.backup' '$CCS_ROOT/.claude'
    [[ \$output =~ 'CCS repository directory' ]]
"

test_case "Error: Uses error indicator ✗" "Error messages have ✗ indicator" bash -c "
    mv '$CCS_ROOT/.claude' '$CCS_ROOT/.claude.backup'
    output=\$(HOME='$TEST_HOME' '$CCS_PATH' --install 2>&1 || true)
    mv '$CCS_ROOT/.claude.backup' '$CCS_ROOT/.claude'
    [[ \$output =~ ✗ ]]
"

# ============================================================================
# SECTION 7: PERMISSIONS AND OWNERSHIP
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 7: PERMISSIONS AND OWNERSHIP =====${NC}"

rm -rf "$TEST_CLAUDE_DIR"
HOME=$(dirname "$TEST_CLAUDE_DIR") "$CCS_PATH" --install > /dev/null 2>&1

test_case "Permissions: Command file is readable" "ccs.md has read permissions" bash -c "
    [[ -r '$TEST_CLAUDE_DIR/commands/ccs.md' ]]
"

test_case "Permissions: Skill file is readable" "SKILL.md has read permissions" bash -c "
    [[ -r '$TEST_CLAUDE_DIR/skills/ccs-delegation/SKILL.md' ]]
"

test_case "Permissions: Directories are accessible" "Can list directory contents" bash -c "
    ls '$TEST_CLAUDE_DIR/commands' > /dev/null 2>&1 &&
    ls '$TEST_CLAUDE_DIR/skills' > /dev/null 2>&1
"

# ============================================================================
# SECTION 8: INTEGRATION WITH CCS
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 8: INTEGRATION WITH CCS =====${NC}"

test_case "Integration: --install flag recognized" "--install doesn't show 'Profile not found'" bash -c "
    output=\$('$CCS_PATH' --install 2>&1 || true)
    ! [[ \$output =~ 'Profile.*--install.*not found' ]]
"

test_case "Integration: --version still works after --install" "Version command functional" bash -c "
    output=\$('$CCS_PATH' --version 2>&1)
    [[ \$output =~ 'CCS' ]]
"

test_case "Integration: --help still works after --install" "Help command functional" bash -c "
    output=\$('$CCS_PATH' --help 2>&1)
    [[ \$output =~ 'Usage' ]] || [[ \$output =~ 'Claude' ]]
"

# ============================================================================
# FINAL RESULTS
# ============================================================================
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}TEST RESULTS SUMMARY${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "${CYAN}Total Tests: $TOTAL_TESTS${NC}"
echo -e "${GREEN}Passed:      $PASS_COUNT${NC}"

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}Failed:      $FAIL_COUNT${NC}"
else
    echo -e "${RED}Failed:      $FAIL_COUNT${NC}"
fi

echo ""

SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($PASS_COUNT / $TOTAL_TESTS) * 100}")

if awk "BEGIN {exit !($SUCCESS_RATE >= 90)}"; then
    echo -e "${GREEN}Success Rate: $SUCCESS_RATE%${NC}"
elif awk "BEGIN {exit !($SUCCESS_RATE >= 70)}"; then
    echo -e "${YELLOW}Success Rate: $SUCCESS_RATE%${NC}"
else
    echo -e "${RED}Success Rate: $SUCCESS_RATE%${NC}"
fi

echo ""

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${GREEN}--install functionality is production ready!${NC}"
    exit 0
else
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}SOME TESTS FAILED${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Review failed tests above for details${NC}"
    exit 1
fi
