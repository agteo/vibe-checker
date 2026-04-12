# Hybrid Package Version Detection for Vulnerability Scanning

## Overview

This implementation improves vulnerability scanning accuracy by using exact versions from lockfiles (e.g., `package-lock.json`) instead of version ranges from manifest files (e.g., `package.json`). This eliminates false positives like the React 19.2.1 case where the scanner saw `^19.1.0` and flagged it as vulnerable, even though 19.2.1 is patched.

## How It Works

### 1. **PackageVersionService** (`packageVersionService.ts`)

Extracts package versions using a three-tier strategy:

1. **Lockfile First** (Most Accurate)
   - Reads `package-lock.json` for npm (exact versions)
   - Extracts all dependencies including transitive ones
   - Marks direct vs indirect dependencies

2. **Manifest Fallback** (Better Than Nothing)
   - Falls back to `package.json` if lockfile doesn't exist
   - Uses version ranges (e.g., `^19.1.0`)
   - Also supports `requirements.txt` (Python) and `pom.xml` (Maven)

3. **Direct Identifiers** (Current Method)
   - Parses package identifiers like `react@19.2.1` or `react@^19.1.0`
   - Works when repository files aren't available

### 2. **Enhanced OSVService** (`osvService.ts`)

Implements hybrid vulnerability querying:

- **Exact Version Queries**: When we have exact versions from lockfiles, queries OSV.dev directly (most efficient)
- **Range-Based Queries**: When only ranges are available, fetches all vulnerabilities for the package and filters client-side
- **Hybrid Approach**: Combines both methods to catch vulnerabilities defined by:
  - Explicit version enumeration
  - Version ranges (e.g., ">=19.0.0 <19.2.1")

### 3. **Updated ScanExecutionService** (`scanExecutionService.ts`)

Enhanced OSV scanning to:

- **Extract from Repository Paths**: If a `repository` or `filepath` identifier is provided, attempts to read lockfiles/manifests
- **Use Direct Identifiers**: Falls back to direct package identifiers (current behavior)
- **Scan Transitive Dependencies**: Automatically includes all dependencies from lockfiles
- **Provide Better Metadata**: Findings now include:
  - `isDirect`: Whether it's a direct or transitive dependency
  - `source`: Where the version came from (`lockfile`, `manifest`, or `identifier`)
  - `confidence`: `high` for exact versions, `medium` for ranges

## Benefits

### ✅ Eliminates False Positives
- **Before**: `react@^19.1.0` → Flagged as vulnerable (false positive)
- **After**: `react@19.2.1` (from lockfile) → Not flagged (correct)

### ✅ Reduces False Negatives
- Checks both exact versions AND range-based vulnerability definitions
- Scans transitive dependencies automatically
- Falls back gracefully when lockfiles aren't available

### ✅ Better Accuracy
- **High Confidence**: Exact versions from lockfiles
- **Medium Confidence**: Version ranges from manifests
- Clear indication of confidence level in findings

## Usage

### Example 1: Direct Package Identifiers (Current Method)
```json
{
  "identifiers": [
    { "type": "npm", "value": "react@19.2.1" }
  ]
}
```
- Uses exact version if provided
- Falls back to range-based query if range detected

### Example 2: Repository Path (New Feature)
```json
{
  "identifiers": [
    { "type": "filepath", "value": "/path/to/project" }
  ]
}
```
- Automatically extracts all packages from `package-lock.json`
- Includes transitive dependencies
- Falls back to `package.json` if lockfile missing

### Example 3: Mixed Approach
```json
{
  "identifiers": [
    { "type": "filepath", "value": "/path/to/project" },
    { "type": "npm", "value": "custom-package@1.0.0" }
  ]
}
```
- Extracts from repository first
- Adds any additional direct identifiers
- Deduplicates packages

## Technical Details

### Version Range Detection
The system detects version ranges using patterns:
- `^19.1.0` (caret ranges)
- `~2.0.0` (tilde ranges)
- `>=1.0.0` (comparison operators)
- `1.0.0 - 2.0.0` (range syntax)
- `*` or `latest` (wildcards)

### Ecosystem Support
- **npm**: `package-lock.json` (v6 and v7+ formats), `package.json`
- **PyPI**: `requirements.txt` (basic support), `poetry.lock` (planned)
- **Maven**: `pom.xml` (basic support)

### Error Handling
- Gracefully handles missing files
- Falls back to next strategy automatically
- Logs warnings but continues scanning
- Never fails completely due to file access issues

## Future Enhancements

1. **Semver Library**: Replace basic version comparison with proper semver library for better range handling
2. **Poetry Support**: Add full TOML parsing for `poetry.lock`
3. **Yarn Support**: Add `yarn.lock` parsing
4. **Repository Cloning**: Automatically clone Git repositories before scanning
5. **Caching**: Cache lockfile parsing results for repeated scans

## Testing

To test the implementation:

1. **Exact Version Test**:
   ```bash
   # Create a target with exact version
   POST /api/targets
   {
     "identifiers": [{ "type": "npm", "value": "react@19.2.1" }]
   }
   ```
   Should NOT flag CVE-2025-55182 (patched version)

2. **Range Version Test**:
   ```bash
   # Create a target with version range
   POST /api/targets
   {
     "identifiers": [{ "type": "npm", "value": "react@^19.1.0" }]
   }
   ```
   Should flag with medium confidence, recommending verification

3. **Lockfile Test**:
   ```bash
   # Create a target with filepath
   POST /api/targets
   {
     "identifiers": [{ "type": "filepath", "value": "/path/to/project" }]
   }
   ```
   Should extract exact versions from `package-lock.json`
