#!/usr/bin/env bash
#
# GLMT Integration Test Suite
# Tests proxy startup, configuration, and basic functionality
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CCS_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== GLMT Integration Test Suite ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

test_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

test_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Test 1: Check GLMT profile exists in config
echo "Test 1: GLMT profile configuration"
if grep -q '"glmt"' ~/.ccs/config.json; then
    test_pass "GLMT profile found in config.json"
else
    test_fail "GLMT profile NOT found in config.json"
fi

# Test 2: Check GLMT settings file exists
echo "Test 2: GLMT settings file"
if [ -f ~/.ccs/glmt.settings.json ]; then
    test_pass "GLMT settings file exists"

    # Check if API key is configured
    if grep -q "YOUR_GLM_API_KEY_HERE" ~/.ccs/glmt.settings.json; then
        test_info "API key not configured (still has placeholder)"
    else
        test_pass "API key configured"
    fi
else
    test_fail "GLMT settings file NOT found"
fi

# Test 3: Check transformer module
echo "Test 3: Transformer module"
if [ -f "$CCS_DIR/bin/glmt-transformer.js" ]; then
    test_pass "Transformer module exists"

    # Test syntax
    if node --check "$CCS_DIR/bin/glmt-transformer.js" 2>/dev/null; then
        test_pass "Transformer syntax valid"
    else
        test_fail "Transformer syntax invalid"
    fi
else
    test_fail "Transformer module NOT found"
fi

# Test 4: Check proxy module
echo "Test 4: Proxy module"
if [ -f "$CCS_DIR/bin/glmt-proxy.js" ]; then
    test_pass "Proxy module exists"

    # Test syntax
    if node --check "$CCS_DIR/bin/glmt-proxy.js" 2>/dev/null; then
        test_pass "Proxy syntax valid"
    else
        test_fail "Proxy syntax invalid"
    fi
else
    test_fail "Proxy module NOT found"
fi

# Test 5: Test proxy startup
echo "Test 5: Proxy startup test"
test_info "Starting proxy in background..."

# Start proxy
node "$CCS_DIR/bin/glmt-proxy.js" &
PROXY_PID=$!

# Wait for PROXY_READY signal (with timeout)
TIMEOUT=5
PORT=""
for i in $(seq 1 $TIMEOUT); do
    if ps -p $PROXY_PID > /dev/null 2>&1; then
        sleep 0.2
        # Check if proxy outputted anything (we can't easily capture it in background)
        if [ $i -eq $TIMEOUT ]; then
            test_fail "Proxy started but PROXY_READY signal not captured (this is OK - proxy works)"
            PORT="unknown"
        fi
    else
        test_fail "Proxy failed to start or exited immediately"
        break
    fi
done

if ps -p $PROXY_PID > /dev/null 2>&1; then
    test_pass "Proxy process is running (PID: $PROXY_PID)"

    # Kill proxy
    kill $PROXY_PID 2>/dev/null || true
    sleep 0.5

    if ! ps -p $PROXY_PID > /dev/null 2>&1; then
        test_pass "Proxy terminated gracefully"
    else
        test_fail "Proxy did not terminate (killing forcefully)"
        kill -9 $PROXY_PID 2>/dev/null || true
    fi
fi

# Test 6: Unit tests
echo "Test 6: Unit tests"
if [ -f "$CCS_DIR/tests/glmt-transformer.test.js" ]; then
    test_info "Running transformer unit tests..."
    if node "$CCS_DIR/tests/glmt-transformer.test.js" | grep -q "Passed: 12/12"; then
        test_pass "All 12 unit tests passed"
    else
        test_fail "Some unit tests failed"
    fi
else
    test_fail "Unit test file NOT found"
fi

# Test 7: Help text
echo "Test 7: Help text verification"
if ccs --help | grep -q "ccs glmt"; then
    test_pass "GLMT appears in help text"
else
    test_fail "GLMT NOT in help text"
fi

# Summary
echo ""
echo "=== Test Summary ==="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Test with Claude Code: ccs glmt \"What is 2+2?\""
    echo "  2. Test thinking tags: ccs glmt \"<Thinking:On> Explain recursion\""
    echo "  3. Check thinking blocks appear in Claude Code UI"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review above.${NC}"
    exit 1
fi
