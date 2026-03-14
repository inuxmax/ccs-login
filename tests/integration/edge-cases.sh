#!/usr/bin/env bash
# CCS COMPREHENSIVE TEST SUITE - Master Orchestrator
# Runs all test suites in the correct order
# Maintains backward compatibility with existing usage

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared utilities
source "$SCRIPT_DIR/shared/helpers.sh"

# Print test header
print_test_header "CCS COMPREHENSIVE TEST SUITE"

echo ""
echo -e "${CYAN}This master test suite runs:${NC}"
echo -e "${GRAY}  1. Native Unix tests (traditional installation)${NC}"
echo -e "${GRAY}  2. npm package tests (Node.js framework)${NC}"
echo ""

# Track overall results
OVERALL_PASS=0
OVERALL_FAIL=0
OVERALL_TOTAL=0

# Function to run a test suite and capture results
run_test_suite() {
    local suite_name="$1"
    local suite_command="$2"

    echo ""
    print_section_header "Running $suite_name"
    echo ""

    # Reset counters for this suite
    reset_test_counters

    # Run the test suite and capture output
    if bash -c "$suite_command"; then
        # Suite passed
        local suite_passed=$PASS_COUNT
        local suite_failed=$FAIL_COUNT
        local suite_total=$TOTAL_TESTS

        echo -e "${GREEN}$suite_name completed successfully${NC}"
        echo -e "${CYAN}Tests: $suite_passed/$suite_total passed${NC}"

        # Add to overall totals
        ((OVERALL_PASS += suite_passed))
        ((OVERALL_FAIL += suite_failed))
        ((OVERALL_TOTAL += suite_total))

        return 0
    else
        # Suite failed
        local suite_passed=$PASS_COUNT
        local suite_failed=$FAIL_COUNT
        local suite_total=$TOTAL_TESTS

        echo -e "${RED}$suite_name failed${NC}"
        echo -e "${YELLOW}Tests: $suite_passed/$suite_total passed, $suite_failed failed${NC}"

        # Add to overall totals
        ((OVERALL_PASS += suite_passed))
        ((OVERALL_FAIL += suite_failed))
        ((OVERALL_TOTAL += suite_total))

        return 1
    fi
}

# Test Suite 1: Native Unix Tests
if [[ -f "$SCRIPT_DIR/native/unix/edge-cases.sh" ]]; then
    if run_test_suite "Native Unix Tests" "cd '$SCRIPT_DIR' && bash native/unix/edge-cases.sh"; then
        echo -e "${GREEN}✓ Native Unix tests passed${NC}"
    else
        echo -e "${YELLOW}⚠ Native Unix tests had failures${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Native Unix tests not found, skipping${NC}"
fi

# Test Suite 2: npm Package Tests
if command -v node &> /dev/null; then
    if [[ -f "$SCRIPT_DIR/../package.json" ]]; then
        echo ""
        print_section_header "Running npm Package Tests"
        echo ""

        # Reset counters for npm tests
        reset_test_counters

        # Change to the project root directory and run npm tests
        if cd "$SCRIPT_DIR/.." && npm run test:npm 2>/dev/null; then
            echo -e "${GREEN}✓ npm package tests passed${NC}"

            # Note: npm tests don't use our counter system, so we'll estimate
            # We could parse npm test output, but for now just acknowledge success
            echo -e "${CYAN}npm tests completed successfully${NC}"
        else
            echo -e "${YELLOW}⚠ npm package tests had failures or could not run${NC}"
            ((OVERALL_FAIL++))  # Count as at least one failure
        fi

        # Return to tests directory
        cd "$SCRIPT_DIR"
    else
        echo -e "${YELLOW}⚠ package.json not found, skipping npm tests${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Node.js not found, skipping npm tests${NC}"
    echo -e "${GRAY}  Install Node.js to run npm package tests${NC}"
fi

# Final Summary
echo ""
print_test_header "FINAL TEST RESULTS"

# Update final counters with actual totals
TOTAL_TESTS=$OVERALL_TOTAL
PASS_COUNT=$OVERALL_PASS
FAIL_COUNT=$OVERALL_FAIL

if [[ $TOTAL_TESTS -gt 0 ]]; then
    print_test_summary
else
    echo -e "${YELLOW}No tests were executed${NC}"
fi

print_final_result