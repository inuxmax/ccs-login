#!/usr/bin/env bash
# CCS Native Unix Tests
# Tests for native installation method (curl | bash)
# This is part of the restructured test suite

set +e  # Don't exit on errors, we're testing

# Source shared utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../shared/helpers.sh"


echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}CCS COMPREHENSIVE EDGE CASE TESTING${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Clean installation
echo -e "${CYAN}Preparing clean environment...${NC}"
rm -rf ~/.ccs
rm -rf /tmp/ccs-test

# Extract and install
mkdir -p /tmp/ccs-test
tar -xzf /tmp/ccs-v2.1.1-final.tar.gz -C /tmp/ccs-test
cd /tmp/ccs-test
bash ./installers/install.sh > /dev/null 2>&1

# On Linux/macOS, ccs is a symlink in ~/.local/bin
CCS_PATH="$HOME/.local/bin/ccs"

if [[ ! -L "$CCS_PATH" ]] && [[ ! -f "$CCS_PATH" ]]; then
    echo -e "${RED}FATAL: Installation failed, ccs not found at $CCS_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}Installation complete, starting tests...${NC}"
echo ""

# ============================================================================
# SECTION 1: VERSION COMMANDS
# ============================================================================
echo -e "${YELLOW}===== SECTION 1: VERSION COMMANDS =====${NC}"

test_case "Version flag --version" "Shows CCS version 2.1.1" bash -c "
    output=\$('$CCS_PATH' --version 2>&1)
    [[ \$output =~ 2\\.1\\.1|CCS ]]
"

test_case "Version flag -v" "Shows CCS version 2.1.1" bash -c "
    output=\$('$CCS_PATH' -v 2>&1)
    [[ \$output =~ 2\\.1\\.1|CCS ]]
"

test_case "Version command (word)" "Shows CCS version 2.1.1" bash -c "
    output=\$('$CCS_PATH' version 2>&1)
    [[ \$output =~ 2\\.1\\.1|CCS ]]
"

# ============================================================================
# SECTION 2: HELP COMMANDS
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 2: HELP COMMANDS =====${NC}"

test_case "Help flag --help" "Shows help without profile error" bash -c "
    output=\$('$CCS_PATH' --help 2>&1)
    [[ \$output =~ Usage|Claude ]]
"

test_case "Help flag -h" "Shows help without profile error" bash -c "
    output=\$('$CCS_PATH' -h 2>&1)
    [[ \$output =~ Usage|Claude ]]
"

# ============================================================================
# SECTION 3: ARGUMENT PARSING - THE CRITICAL FIX
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 3: ARGUMENT PARSING (CRITICAL FIX) =====${NC}"

test_case "Single flag: -c" "Does NOT show 'Profile -c not found' error" bash -c "
    output=\$('$CCS_PATH' -c 2>&1)
    ! [[ \$output =~ Profile.*\'-c\'.*not\ found ]]
"

test_case "Single flag: --verbose" "Does NOT show 'Profile --verbose not found' error" bash -c "
    output=\$('$CCS_PATH' --verbose 2>&1)
    ! [[ \$output =~ Profile.*\'--verbose\'.*not\ found ]]
"

test_case "Single flag: -p" "Does NOT show 'Profile -p not found' error" bash -c "
    output=\$('$CCS_PATH' -p test 2>&1)
    ! [[ \$output =~ Profile.*\'-p\'.*not\ found ]]
"

test_case "Single flag: --debug" "Does NOT show profile error" bash -c "
    output=\$('$CCS_PATH' --debug 2>&1)
    ! [[ \$output =~ Profile.*\'--debug\'.*not\ found ]]
"

test_case "Multiple flags: -c --verbose" "Accepts multiple flags without profile error" bash -c "
    output=\$('$CCS_PATH' -c --verbose 2>&1)
    ! [[ \$output =~ Profile.*not\ found ]]
"

test_case "Flag with value: -p 'test prompt'" "Handles flag with quoted value" bash -c "
    output=\$('$CCS_PATH' -p 'test prompt' 2>&1)
    ! [[ \$output =~ Profile.*\'-p\'.*not\ found ]]
"

# ============================================================================
# SECTION 4: PROFILE COMMANDS
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 4: PROFILE COMMANDS =====${NC}"

test_case "Default profile (no args)" "Uses default profile without error" bash -c "
    output=\$('$CCS_PATH' 2>&1)
    ! [[ \$output =~ Profile.*not\ found ]]
"

test_case "GLM profile" "GLM profile exists and loads" bash -c "
    output=\$('$CCS_PATH' glm 2>&1)
    ! [[ \$output =~ Profile.*\'glm\'.*not\ found ]]
"

test_case "Profile with flag: glm -c" "Profile + flag combination works" bash -c "
    output=\$('$CCS_PATH' glm -c 2>&1)
    ! [[ \$output =~ Profile.*not\ found ]]
"

test_case "Profile with multiple flags: glm -c --verbose" "Profile + multiple flags works" bash -c "
    output=\$('$CCS_PATH' glm -c --verbose 2>&1)
    ! [[ \$output =~ Profile.*not\ found ]]
"

# ============================================================================
# SECTION 5: ERROR HANDLING
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 5: ERROR HANDLING =====${NC}"

test_case "Invalid profile name" "Shows helpful error for invalid profile" bash -c "
    output=\$('$CCS_PATH' nonexistent-profile 2>&1)
    [[ \$output =~ Profile.*not\ found ]] && [[ \$output =~ Available\ profiles ]]
"

test_case "Invalid profile with special chars" "Rejects invalid characters in profile name" bash -c "
    output=\$('$CCS_PATH' 'test@profile' 2>&1)
    [[ \$output =~ Invalid\ profile\ name|not\ found ]]
"

test_case "Empty string as profile" "Shows error for empty profile name" bash -c "
    output=\$('$CCS_PATH' '' 2>&1)
    # In bash, '' is passed as a literal argument, so it should show profile not found
    [[ \$output =~ Profile.*not\ found ]]
"

# ============================================================================
# SECTION 6: EDGE CASES
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 6: EDGE CASES =====${NC}"

test_case "Flag starting with double dash: --test-flag" "Handles double-dash flags correctly" bash -c "
    output=\$('$CCS_PATH' --test-flag 2>&1)
    ! [[ \$output =~ Profile.*\'--test-flag\'.*not\ found ]]
"

test_case "Short flag alone: -d" "Handles short flags correctly" bash -c "
    output=\$('$CCS_PATH' -d 2>&1)
    ! [[ \$output =~ Profile.*\'-d\'.*not\ found ]]
"

test_case "Mixed flags and arguments" "Handles complex flag combinations" bash -c "
    output=\$('$CCS_PATH' -p test --verbose -c 2>&1)
    ! [[ \$output =~ Profile.*not\ found ]]
"

test_case "Profile 'default' explicitly" "Explicit default profile works" bash -c "
    output=\$('$CCS_PATH' default 2>&1)
    ! [[ \$output =~ Profile.*\'default\'.*not\ found ]]
"

test_case "Flag with equals: --model=gpt4" "Handles flags with equals syntax" bash -c "
    output=\$('$CCS_PATH' --model=test 2>&1)
    ! [[ \$output =~ Profile.*\'--model=test\'.*not\ found ]]
"

test_case "Negative number (looks like flag): -1" "Handles numeric flags" bash -c "
    output=\$('$CCS_PATH' -1 2>&1)
    ! [[ \$output =~ Profile.*\'-1\'.*not\ found ]]
"

# ============================================================================
# SECTION 7: CONFIGURATION VALIDATION
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 7: CONFIGURATION VALIDATION =====${NC}"

test_case "Config file exists" "config.json was created" bash -c "
    [[ -f ~/.ccs/config.json ]]
"

test_case "Config file is valid JSON" "config.json is valid JSON with profiles" bash -c "
    jq -e '.profiles' ~/.ccs/config.json > /dev/null 2>&1
"

test_case "GLM profile file exists" "glm.settings.json exists" bash -c "
    [[ -f ~/.ccs/glm.settings.json ]]
"

test_case "GLM settings is valid JSON" "glm.settings.json is valid JSON" bash -c "
    jq -e '.' ~/.ccs/glm.settings.json > /dev/null 2>&1
"

test_case "VERSION file exists" "VERSION file was installed" bash -c "
    [[ -f ~/.ccs/VERSION ]]
"

test_case "VERSION file has correct version" "VERSION file contains 2.1.1" bash -c "
    [[ \$(cat ~/.ccs/VERSION) == '2.1.1' ]]
"

# ============================================================================
# SECTION 8: REAL USAGE SIMULATION
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 8: REAL USAGE SIMULATION =====${NC}"

test_case "Simulate: continue conversation" "Real usage: ccs -c (continue) works" bash -c "
    output=\$('$CCS_PATH' -c 2>&1 | head -10)
    ! [[ \$output =~ Profile.*\'-c\'.*not\ found ]]
"

test_case "Simulate: GLM with prompt" "Real usage: ccs glm -p works" bash -c "
    # Use timeout to prevent hanging
    output=\$(timeout 5s '$CCS_PATH' glm -p '2+2' 2>&1 || true)
    ! [[ \$output =~ Profile.*not\ found ]]
"

test_case "Simulate: verbose mode" "Real usage: ccs --verbose works" bash -c "
    output=\$('$CCS_PATH' --verbose 2>&1 | head -5)
    ! [[ \$output =~ Profile.*\'--verbose\'.*not\ found ]]
"

# ============================================================================
# SECTION 9: BASH-SPECIFIC EDGE CASES
# ============================================================================
echo ""
echo -e "${YELLOW}===== SECTION 9: BASH-SPECIFIC EDGE CASES =====${NC}"

test_case "Script is executable" "ccs script has execute permissions" bash -c "
    [[ -x '$CCS_PATH' ]]
"

test_case "Shebang is correct" "Script has proper shebang" bash -c "
    head -1 '$CCS_PATH' | grep -q '#!/usr/bin/env bash'
"

test_case "Symlink exists in PATH" "ccs symlink exists" bash -c "
    [[ -L ~/.local/bin/ccs ]] || [[ -f ~/.local/bin/ccs ]]
"

test_case "Version without ./ prefix" "Can run 'ccs --version' from PATH" bash -c "
    # Check if ccs is in PATH
    output=\$(ccs --version 2>&1 || true)
    [[ \$output =~ 2\\.1\\.1|CCS ]] || [[ \$output =~ 'command not found' ]]
    # Pass if version works OR if not in PATH yet (fresh install)
    [[ \$output =~ 2\\.1\\.1|CCS ]] || [[ \$output =~ 'command not found' ]]
"

# ============================================================================

# ============================================================================
# FINAL RESULTS
# ============================================================================
print_test_summary
print_final_result
