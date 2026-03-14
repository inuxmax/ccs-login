#!/usr/bin/env bash
# Shared test utilities for CCS test suite
# Common functions and variables used across multiple test files

# Test counters
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

# Test case function
# Usage: test_case "Test Name" "Expected outcome" command [args...]
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

# Print test summary
# Usage: print_test_summary
print_test_summary() {
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

    SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($PASS_COUNT / $TOTAL_TESTS) * 100}")

    # Use awk for comparison since bc may not be installed
    if awk "BEGIN {exit !($SUCCESS_RATE >= 90)}"; then
        echo -e "${GREEN}Success Rate: $SUCCESS_RATE%${NC}"
    elif awk "BEGIN {exit !($SUCCESS_RATE >= 70)}"; then
        echo -e "${YELLOW}Success Rate: $SUCCESS_RATE%${NC}"
    else
        echo -e "${RED}Success Rate: $SUCCESS_RATE%${NC}"
    fi

    if [[ $FAIL_COUNT -eq 0 ]]; then
        return 0
    else
        return 1
    fi
}

# Print final result with exit code
# Usage: print_final_result
print_final_result() {
    echo ""

    if [[ $FAIL_COUNT -eq 0 ]]; then
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}ALL TESTS PASSED!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo ""
        echo -e "${GREEN}CCS is ready for production use!${NC}"
        exit 0
    else
        echo -e "${YELLOW}========================================${NC}"
        echo -e "${YELLOW}SOME TESTS FAILED${NC}"
        echo -e "${YELLOW}========================================${NC}"
        echo ""
        echo -e "${YELLOW}Review failed tests above for details${NC}"
        exit 1
    fi
}

# Print test header
# Usage: print_test_header "Test Suite Name"
print_test_header() {
    local suite_name="$1"
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$suite_name${NC}"
    echo -e "${YELLOW}========================================${NC}"
}

# Print section header
# Usage: print_section_header "Section Name"
print_section_header() {
    echo ""
    echo -e "${YELLOW}===== $1 =====${NC}"
}

# Reset test counters
# Usage: reset_test_counters
reset_test_counters() {
    PASS_COUNT=0
    FAIL_COUNT=0
    TOTAL_TESTS=0
}