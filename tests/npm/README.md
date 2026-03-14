# npm Package Tests

Tests for npm installation method of CCS.

## Files

- `postinstall.test.js` - Postinstall behavior and configuration creation
- `cli.test.js` - CLI argument parsing and profile handling
- `cross-platform.test.js` - Cross-platform compatibility tests

## Running

```bash
# Run only npm tests
npm run test:npm

# Run with verbose output
npm run test:npm -- --reporter spec

# Run specific test file
npx mocha tests/npm/postinstall.test.js
```

## Test Coverage

These tests cover:
- Postinstall script behavior (Section 10 from original edge-cases.sh)
- CLI argument parsing for npm package
- Cross-platform path handling
- Configuration file creation and management
- Profile system functionality