import fs from 'fs/promises';
import path from 'path';

export interface PackageVersion {
  name: string;
  version: string;
  ecosystem: 'npm' | 'pypi' | 'maven';
  isDirect: boolean;
  source: 'lockfile' | 'manifest' | 'identifier';
}

export interface PackageVersionResult {
  packages: PackageVersion[];
  source: 'lockfile' | 'manifest' | 'identifier';
  lockfilePath?: string;
  manifestPath?: string;
}

export class PackageVersionService {
  /**
   * Extract package versions from a repository or file path
   * Tries package-lock.json first (exact versions), falls back to package.json (ranges)
   */
  async extractPackageVersions(
    basePath: string,
    ecosystem: 'npm' | 'pypi' | 'maven' = 'npm'
  ): Promise<PackageVersionResult> {
    try {
      // Try lockfile first (exact versions)
      const lockfileResult = await this.tryExtractFromLockfile(basePath, ecosystem);
      if (lockfileResult) {
        return lockfileResult;
      }

      // Fall back to manifest file (ranges)
      const manifestResult = await this.tryExtractFromManifest(basePath, ecosystem);
      if (manifestResult) {
        return manifestResult;
      }

      // If neither found, return empty
      return {
        packages: [],
        source: 'identifier'
      };
    } catch (error) {
      console.error(`Error extracting package versions from ${basePath}:`, error);
      return {
        packages: [],
        source: 'identifier'
      };
    }
  }

  /**
   * Extract exact versions from lockfile (package-lock.json, requirements.txt.lock, etc.)
   */
  private async tryExtractFromLockfile(
    basePath: string,
    ecosystem: 'npm' | 'pypi' | 'maven'
  ): Promise<PackageVersionResult | null> {
    let lockfilePath: string;
    let lockfileContent: any;

    switch (ecosystem) {
      case 'npm':
        lockfilePath = path.join(basePath, 'package-lock.json');
        try {
          const content = await fs.readFile(lockfilePath, 'utf-8');
          lockfileContent = JSON.parse(content);
        } catch {
          return null;
        }

        const packages: PackageVersion[] = [];
        const directDeps = new Set<string>();

        // Get direct dependencies from package.json
        try {
          const manifestPath = path.join(basePath, 'package.json');
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(manifestContent);
          
          // Mark direct dependencies
          const allDeps = {
            ...manifest.dependencies,
            ...manifest.devDependencies,
            ...manifest.peerDependencies,
            ...manifest.optionalDependencies
          };
          Object.keys(allDeps).forEach(name => directDeps.add(name));
        } catch {
          // If package.json doesn't exist, we'll mark all as indirect
        }

        // Extract all packages from lockfile
        if (lockfileContent.packages) {
          // npm v7+ format (packages object)
          for (const [pkgPath, pkgData] of Object.entries(lockfileContent.packages as Record<string, { version?: string }>)) {
            if (pkgData && typeof pkgData === 'object' && 'version' in pkgData) {
              const pkgName = pkgPath === '' ? lockfileContent.name : this.extractPackageNameFromPath(pkgPath);
              if (pkgName && pkgData.version) {
                packages.push({
                  name: pkgName,
                  version: String(pkgData.version),
                  ecosystem: 'npm',
                  isDirect: directDeps.has(pkgName),
                  source: 'lockfile'
                });
              }
            }
          }
        } else if (lockfileContent.dependencies) {
          // npm v6 format (dependencies tree)
          this.extractFromDependencyTree(lockfileContent.dependencies, packages, directDeps, '');
        }

        return {
          packages,
          source: 'lockfile',
          lockfilePath
        };

      case 'pypi':
        // For Python, check for requirements.txt.lock or poetry.lock
        lockfilePath = path.join(basePath, 'poetry.lock');
        try {
          const content = await fs.readFile(lockfilePath, 'utf-8');
          // Poetry lock files are TOML format - would need a TOML parser
          // For now, return null and fall back to requirements.txt
          return null;
        } catch {
          return null;
        }

      case 'maven':
        // Maven uses pom.xml with dependencyManagement, not typically a lockfile
        return null;

      default:
        return null;
    }
  }

  /**
   * Extract version ranges from manifest file (package.json, requirements.txt, pom.xml)
   */
  private async tryExtractFromManifest(
    basePath: string,
    ecosystem: 'npm' | 'pypi' | 'maven'
  ): Promise<PackageVersionResult | null> {
    let manifestPath: string;
    let packages: PackageVersion[] = [];

    switch (ecosystem) {
      case 'npm':
        manifestPath = path.join(basePath, 'package.json');
        try {
          const content = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(content);

          const allDeps = {
            ...manifest.dependencies,
            ...manifest.devDependencies,
            ...manifest.peerDependencies,
            ...manifest.optionalDependencies
          };

          packages = Object.entries(allDeps).map(([name, versionRange]) => ({
            name,
            version: typeof versionRange === 'string' ? versionRange : 'latest',
            ecosystem: 'npm',
            isDirect: true,
            source: 'manifest'
          }));

          return {
            packages,
            source: 'manifest',
            manifestPath
          };
        } catch {
          return null;
        }

      case 'pypi':
        manifestPath = path.join(basePath, 'requirements.txt');
        try {
          const content = await fs.readFile(manifestPath, 'utf-8');
          const lines = content.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-');
          });

          packages = lines.map(line => {
            // Parse requirements.txt format: package==version or package>=version, etc.
            const match = line.match(/^([a-zA-Z0-9_-]+(?:\[[^\]]+\])?)(.*)$/);
            if (match) {
              const name = match[1].split('[')[0]; // Remove extras like package[extra]
              const versionSpec = match[2].trim() || 'latest';
              return {
                name,
                version: versionSpec,
                ecosystem: 'pypi',
                isDirect: true,
                source: 'manifest'
              };
            }
            return null;
          }).filter((pkg): pkg is PackageVersion => pkg !== null);

          return {
            packages,
            source: 'manifest',
            manifestPath
          };
        } catch {
          return null;
        }

      case 'maven':
        manifestPath = path.join(basePath, 'pom.xml');
        try {
          const content = await fs.readFile(manifestPath, 'utf-8');
          // Simple XML parsing for dependencies
          const dependencyRegex = /<dependency>[\s\S]*?<groupId>([^<]+)<\/groupId>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?<version>([^<]+)<\/version>[\s\S]*?<\/dependency>/g;
          let match;
          while ((match = dependencyRegex.exec(content)) !== null) {
            packages.push({
              name: `${match[1]}:${match[2]}`,
              version: match[3],
              ecosystem: 'maven',
              isDirect: true,
              source: 'manifest'
            });
          }

          return {
            packages,
            source: 'manifest',
            manifestPath
          };
        } catch {
          return null;
        }

      default:
        return null;
    }
  }

  /**
   * Extract packages from npm v6 dependency tree format
   */
  private extractFromDependencyTree(
    dependencies: Record<string, any>,
    packages: PackageVersion[],
    directDeps: Set<string>,
    parentPath: string
  ): void {
    for (const [name, depData] of Object.entries(dependencies)) {
      if (depData && typeof depData === 'object' && 'version' in depData) {
        const fullPath = parentPath ? `${parentPath}/node_modules/${name}` : name;
        packages.push({
          name,
          version: depData.version,
          ecosystem: 'npm',
          isDirect: directDeps.has(name),
          source: 'lockfile'
        });

        // Recursively extract nested dependencies
        if (depData.dependencies) {
          this.extractFromDependencyTree(depData.dependencies, packages, directDeps, fullPath);
        }
      }
    }
  }

  /**
   * Extract package name from npm package path
   * e.g., "node_modules/react" -> "react"
   */
  private extractPackageNameFromPath(pkgPath: string): string {
    if (!pkgPath) return '';
    const parts = pkgPath.split('/');
    // Find the last "node_modules" segment or use the last part
    const nodeModulesIndex = parts.lastIndexOf('node_modules');
    if (nodeModulesIndex >= 0 && nodeModulesIndex < parts.length - 1) {
      return parts[nodeModulesIndex + 1];
    }
    return parts[parts.length - 1];
  }

  /**
   * Parse package identifier string (e.g., "react@^19.1.0" or "react@19.2.1")
   */
  parsePackageIdentifier(identifier: string, ecosystem: 'npm' | 'pypi' | 'maven' = 'npm'): PackageVersion | null {
    try {
      const parts = identifier.split('@');
      if (parts.length < 2) {
        return null;
      }

      // Handle scoped packages (e.g., @types/node@18.0.0)
      let name: string;
      let version: string;

      if (identifier.startsWith('@')) {
        // Scoped package: @scope/package@version
        const versionIndex = identifier.lastIndexOf('@');
        name = identifier.substring(0, versionIndex);
        version = identifier.substring(versionIndex + 1);
      } else {
        // Regular package: package@version
        name = parts[0];
        version = parts.slice(1).join('@'); // In case version contains @
      }

      return {
        name,
        version: version || 'latest',
        ecosystem,
        isDirect: true,
        source: 'identifier'
      };
    } catch {
      return null;
    }
  }
}
