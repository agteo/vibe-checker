import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PackageVersionService } from './services/packageVersionService.js';

test('PackageVersionService parses scoped package identifiers', () => {
  const service = new PackageVersionService();
  const result = service.parsePackageIdentifier('@types/node@22.14.0', 'npm');

  assert.deepEqual(result, {
    name: '@types/node',
    version: '22.14.0',
    ecosystem: 'npm',
    isDirect: true,
    source: 'identifier',
  });
});

test('PackageVersionService prefers exact versions from package-lock.json', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibe-check-pkgs-'));

  try {
    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'fixture',
        dependencies: {
          express: '^4.22.1',
        },
      })
    );

    await fs.writeFile(
      path.join(tempDir, 'package-lock.json'),
      JSON.stringify({
        name: 'fixture',
        lockfileVersion: 3,
        packages: {
          '': {
            name: 'fixture',
            version: '1.0.0',
          },
          'node_modules/express': {
            version: '4.22.1',
          },
        },
      })
    );

    const service = new PackageVersionService();
    const result = await service.extractPackageVersions(tempDir, 'npm');

    assert.equal(result.source, 'lockfile');
    assert.equal(result.packages.some((pkg) => pkg.name === 'express' && pkg.version === '4.22.1' && pkg.isDirect), true);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
