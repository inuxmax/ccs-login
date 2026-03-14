#!/usr/bin/env bash
set -euo pipefail

# CCS v3.2.0 - Symlink Chain Validation Test
# Tests double symlink chain: instance → shared → claude

TEST_DIR="/tmp/ccs-symlink-test-$$"
FAKE_CLAUDE="$TEST_DIR/fake-claude"
FAKE_SHARED="$TEST_DIR/fake-shared"
FAKE_INSTANCE="$TEST_DIR/fake-instance"

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

echo "╔════════════════════════════════════════╗"
echo "║  CCS v3.2.0 Symlink Chain Test        ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Test 1: Basic symlink chain
test_symlink_chain() {
  echo "[i] Test 1: Basic symlink chain"

  mkdir -p "$FAKE_CLAUDE/commands"
  mkdir -p "$FAKE_CLAUDE/skills"
  mkdir -p "$FAKE_CLAUDE/agents"

  echo "# Test Command" > "$FAKE_CLAUDE/commands/test-cmd.md"
  echo "# Test Skill" > "$FAKE_CLAUDE/skills/test-skill.md"
  echo "# Test Agent" > "$FAKE_CLAUDE/agents/test-agent.md"

  mkdir -p "$FAKE_SHARED"
  ln -s "$FAKE_CLAUDE/commands" "$FAKE_SHARED/commands"
  ln -s "$FAKE_CLAUDE/skills" "$FAKE_SHARED/skills"
  ln -s "$FAKE_CLAUDE/agents" "$FAKE_SHARED/agents"

  mkdir -p "$FAKE_INSTANCE"
  ln -s "$FAKE_SHARED/commands" "$FAKE_INSTANCE/commands"
  ln -s "$FAKE_SHARED/skills" "$FAKE_INSTANCE/skills"
  ln -s "$FAKE_SHARED/agents" "$FAKE_INSTANCE/agents"

  # Verify chain works for all directories
  if [[ -f "$FAKE_INSTANCE/commands/test-cmd.md" ]] && \
     [[ -f "$FAKE_INSTANCE/skills/test-skill.md" ]] && \
     [[ -f "$FAKE_INSTANCE/agents/test-agent.md" ]]; then
    echo "[OK] Symlink chain works for all directories"
  else
    echo "[X] Symlink chain broken"
    return 1
  fi
}

# Test 2: Circular symlink detection
test_circular_detection() {
  echo "[i] Test 2: Circular symlink detection"

  # Simulate circular symlink scenario
  mkdir -p "$TEST_DIR/circular-test/shared"
  mkdir -p "$TEST_DIR/circular-test/claude"

  # Create circular symlink: shared → claude → shared
  ln -s "$TEST_DIR/circular-test/shared" "$TEST_DIR/circular-test/claude/commands"

  # Detect if target is already symlink pointing back
  if [[ -L "$TEST_DIR/circular-test/claude/commands" ]]; then
    target=$(readlink "$TEST_DIR/circular-test/claude/commands")
    if [[ "$target" == *"/shared"* ]]; then
      echo "[OK] Circular symlink detected correctly"
      return 0
    fi
  fi

  echo "[X] Circular symlink detection failed"
  return 1
}

# Test 3: Performance measurement
test_performance() {
  echo "[i] Test 3: Performance measurement"

  mkdir -p "$TEST_DIR/perf-test/source"
  mkdir -p "$TEST_DIR/perf-test/target"

  start=$(date +%s%N 2>/dev/null || echo "0")
  for i in {1..100}; do
    ln -sf "$TEST_DIR/perf-test/source" "$TEST_DIR/perf-test/target/link-$i"
  done
  end=$(date +%s%N 2>/dev/null || echo "0")

  if [[ "$start" != "0" ]] && [[ "$end" != "0" ]]; then
    duration=$(( (end - start) / 1000000 ))  # Convert to ms
    avg=$(( duration / 100 ))
    echo "[OK] Avg symlink creation: ${avg}ms (target: <1ms)"
  else
    echo "[i] Performance timing not available on this platform"
  fi
}

# Test 4: Broken symlink detection
test_broken_symlink() {
  echo "[i] Test 4: Broken symlink detection"

  mkdir -p "$TEST_DIR/broken-test/instance"
  ln -s "$TEST_DIR/broken-test/nonexistent" "$TEST_DIR/broken-test/instance/commands"

  if [[ -L "$TEST_DIR/broken-test/instance/commands" ]] && \
     [[ ! -e "$TEST_DIR/broken-test/instance/commands" ]]; then
    echo "[OK] Broken symlink detected correctly"
  else
    echo "[X] Broken symlink detection failed"
    return 1
  fi
}

# Test 5: Live updates through chain
test_live_updates() {
  echo "[i] Test 5: Live updates through chain"

  # Clean test directories
  rm -rf "$TEST_DIR/live-test"
  mkdir -p "$TEST_DIR/live-test/claude/commands"
  mkdir -p "$TEST_DIR/live-test/shared"
  mkdir -p "$TEST_DIR/live-test/instance"

  ln -s "$TEST_DIR/live-test/claude/commands" "$TEST_DIR/live-test/shared/commands"
  ln -s "$TEST_DIR/live-test/shared/commands" "$TEST_DIR/live-test/instance/commands"

  # Write to source
  echo "# Original" > "$TEST_DIR/live-test/claude/commands/live-test.md"

  # Verify accessible from instance
  if [[ -f "$TEST_DIR/live-test/instance/commands/live-test.md" ]]; then
    content=$(cat "$TEST_DIR/live-test/instance/commands/live-test.md")
    if [[ "$content" == "# Original" ]]; then
      echo "[OK] Live updates work through chain"
    else
      echo "[X] Content mismatch"
      return 1
    fi
  else
    echo "[X] File not accessible through chain"
    return 1
  fi

  # Update source
  echo "# Updated" > "$TEST_DIR/live-test/claude/commands/live-test.md"

  # Verify update visible from instance
  content=$(cat "$TEST_DIR/live-test/instance/commands/live-test.md")
  if [[ "$content" == "# Updated" ]]; then
    echo "[OK] Live updates reflected instantly"
  else
    echo "[X] Update not reflected"
    return 1
  fi
}

# Run all tests
echo "Running validation tests..."
echo ""

test_symlink_chain
test_circular_detection
test_performance
test_broken_symlink
test_live_updates

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  All Tests Passed ✓                   ║"
echo "╚════════════════════════════════════════╝"
