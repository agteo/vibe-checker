import { getJson, postJson } from './httpClient.js';

export interface PackageInfo {
  name: string;
  version: string;
  ecosystem: string;
}

export interface Vulnerability {
  id: string;
  summary?: string;
  details?: string;
  severity?: Array<{ type: string; score: string }>;
  affected?: Array<{
    package?: { name: string; ecosystem: string };
    ranges?: Array<{
      type: string;
      events: Array<{ introduced?: string; fixed?: string; limit?: string }>;
    }>;
    versions?: string[];
  }>;
}

export class OSVService {
  private baseUrl = 'https://api.osv.dev';

  async queryVulnerabilities(packageInfo: PackageInfo): Promise<Vulnerability[]> {
    try {
      const response = await postJson<{ vulns?: Vulnerability[] }>(`${this.baseUrl}/v1/query`, {
        package: {
          name: packageInfo.name,
          ecosystem: packageInfo.ecosystem,
        },
        version: packageInfo.version,
      });
      return response.vulns || [];
    } catch (error) {
      throw new Error(`OSV query failed: ${error}`);
    }
  }

  async queryVulnerabilitiesByRange(packageInfo: PackageInfo): Promise<Vulnerability[]> {
    try {
      const response = await postJson<{ vulns?: Vulnerability[] }>(`${this.baseUrl}/v1/query`, {
        package: {
          name: packageInfo.name,
          ecosystem: packageInfo.ecosystem,
        },
      });

      const allVulns = response.vulns || [];
      return allVulns.filter((vulnerability) => this.isVersionAffected(packageInfo.version, vulnerability));
    } catch (error) {
      throw new Error(`OSV range query failed: ${error}`);
    }
  }

  async queryVulnerabilitiesHybrid(packageInfo: PackageInfo, isExactVersion: boolean): Promise<Vulnerability[]> {
    try {
      if (isExactVersion && !this.isVersionRange(packageInfo.version)) {
        const exactVulns = await this.queryVulnerabilities(packageInfo);
        const rangeVulns = await this.queryVulnerabilitiesByRange(packageInfo);

        const vulnMap = new Map<string, Vulnerability>();
        [...exactVulns, ...rangeVulns].forEach((vulnerability) => {
          if (!vulnMap.has(vulnerability.id)) {
            vulnMap.set(vulnerability.id, vulnerability);
          }
        });

        return Array.from(vulnMap.values());
      }

      return this.queryVulnerabilitiesByRange(packageInfo);
    } catch (error) {
      throw new Error(`OSV hybrid query failed: ${error}`);
    }
  }

  private isVersionRange(version: string): boolean {
    if (!version || version === 'latest') return true;

    return /^[\^~><=]/.test(version.trim()) ||
      version.includes('||') ||
      version.includes(' - ') ||
      version.includes('x') ||
      version === '*';
  }

  private isVersionAffected(version: string, vulnerability: Vulnerability): boolean {
    if (!vulnerability.affected || vulnerability.affected.length === 0) {
      return false;
    }

    for (const affected of vulnerability.affected) {
      if (affected.versions && affected.versions.includes(version)) {
        return true;
      }

      if (affected.ranges) {
        for (const range of affected.ranges) {
          if (this.isVersionInRange(version, range)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private isVersionInRange(version: string, range: { type: string; events: Array<any> }): boolean {
    if (range.type === 'SEMVER' || range.type === 'ECOSYSTEM') {
      let isAffected = false;
      let introduced = false;

      for (const event of range.events) {
        if (event.introduced) {
          introduced = true;
          isAffected = this.compareVersions(version, event.introduced) >= 0;
        }
        if (event.fixed && this.compareVersions(version, event.fixed) >= 0) {
          isAffected = false;
        }
        if (event.limit && this.compareVersions(version, event.limit) >= 0) {
          isAffected = false;
        }
      }

      return introduced && isAffected;
    }

    return false;
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    const maxLength = Math.max(parts1.length, parts2.length);

    for (let index = 0; index < maxLength; index += 1) {
      const part1 = parts1[index] || 0;
      const part2 = parts2[index] || 0;
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  }

  async getVulnerabilityById(id: string): Promise<any> {
    try {
      return await getJson(`${this.baseUrl}/v1/vulns/${id}`);
    } catch (error) {
      throw new Error(`Failed to get vulnerability details: ${error}`);
    }
  }

  async batchQuery(packages: Array<PackageInfo & { isExactVersion?: boolean }>): Promise<any[]> {
    try {
      const exactVersionPackages = packages.filter((pkg) =>
        pkg.isExactVersion && !this.isVersionRange(pkg.version)
      );

      const rangePackages = packages.filter((pkg) =>
        !pkg.isExactVersion || this.isVersionRange(pkg.version)
      );

      const results: any[] = [];

      if (exactVersionPackages.length > 0) {
        const response = await postJson<{ results?: any[] }>(`${this.baseUrl}/v1/querybatch`, {
          queries: exactVersionPackages.map((pkg) => ({
            package: {
              name: pkg.name,
              ecosystem: pkg.ecosystem,
            },
            version: pkg.version,
          })),
        });

        results.push(...(response.results || []));
      }

      for (const pkg of rangePackages) {
        try {
          const vulns = await this.queryVulnerabilitiesByRange(pkg);
          results.push({ vulns });
        } catch (error) {
          console.error(`Failed to query ${pkg.name}:`, error);
          results.push({ vulns: [] });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`OSV batch query failed: ${error}`);
    }
  }
}
