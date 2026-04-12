import axios from 'axios';

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

  /**
   * Query vulnerabilities for a specific package version (exact version)
   * This is the most accurate method when we have exact versions from lockfiles
   */
  async queryVulnerabilities(packageInfo: PackageInfo): Promise<Vulnerability[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/v1/query`, {
        package: {
          name: packageInfo.name,
          ecosystem: packageInfo.ecosystem
        },
        version: packageInfo.version
      });
      return response.data.vulns || [];
    } catch (error) {
      throw new Error(`OSV query failed: ${error}`);
    }
  }

  /**
   * Query all vulnerabilities for a package and filter by version range client-side
   * This is useful when we only have version ranges from package.json
   * and want to catch range-based vulnerability definitions
   */
  async queryVulnerabilitiesByRange(packageInfo: PackageInfo): Promise<Vulnerability[]> {
    try {
      // First, get all vulnerabilities for the package
      const response = await axios.post(`${this.baseUrl}/v1/query`, {
        package: {
          name: packageInfo.name,
          ecosystem: packageInfo.ecosystem
        }
        // Note: No version specified - gets all vulnerabilities
      });

      const allVulns: Vulnerability[] = response.data.vulns || [];
      
      // Filter vulnerabilities that affect the specified version/range
      return allVulns.filter(vuln => this.isVersionAffected(packageInfo.version, vuln));
    } catch (error) {
      throw new Error(`OSV range query failed: ${error}`);
    }
  }

  /**
   * Hybrid approach: Query with exact version first, then also check range-based vulnerabilities
   * This ensures we catch both enumerated versions and range-based definitions
   */
  async queryVulnerabilitiesHybrid(packageInfo: PackageInfo, isExactVersion: boolean): Promise<Vulnerability[]> {
    try {
      // If we have an exact version, query directly (most efficient)
      if (isExactVersion && !this.isVersionRange(packageInfo.version)) {
        const exactVulns = await this.queryVulnerabilities(packageInfo);
        
        // Also check range-based vulnerabilities to catch any that might be missed
        const rangeVulns = await this.queryVulnerabilitiesByRange(packageInfo);
        
        // Merge and deduplicate by vulnerability ID
        const vulnMap = new Map<string, Vulnerability>();
        [...exactVulns, ...rangeVulns].forEach(vuln => {
          if (!vulnMap.has(vuln.id)) {
            vulnMap.set(vuln.id, vuln);
          }
        });
        
        return Array.from(vulnMap.values());
      } else {
        // For version ranges, use range-based query
        return await this.queryVulnerabilitiesByRange(packageInfo);
      }
    } catch (error) {
      throw new Error(`OSV hybrid query failed: ${error}`);
    }
  }

  /**
   * Check if a version string is a range (e.g., "^19.1.0", ">=1.0.0", "~2.0.0")
   */
  private isVersionRange(version: string): boolean {
    if (!version || version === 'latest') return true;
    // Check for common range indicators
    return /^[\^~><=]/.test(version.trim()) || 
           version.includes('||') || 
           version.includes(' - ') ||
           version.includes('x') ||
           version === '*';
  }

  /**
   * Check if a version is affected by a vulnerability based on its affected ranges/versions
   */
  private isVersionAffected(version: string, vulnerability: Vulnerability): boolean {
    if (!vulnerability.affected || vulnerability.affected.length === 0) {
      return false;
    }

    for (const affected of vulnerability.affected) {
      // Check explicit version list
      if (affected.versions && affected.versions.includes(version)) {
        return true;
      }

      // Check version ranges
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

  /**
   * Check if a version falls within a vulnerability range
   */
  private isVersionInRange(version: string, range: { type: string; events: Array<any> }): boolean {
    // Simplified version comparison - in production, use a proper semver library
    // This handles basic cases like introduced/fixed ranges
    
    if (range.type === 'SEMVER' || range.type === 'ECOSYSTEM') {
      let isAffected = false;
      let introduced = false;

      for (const event of range.events) {
        if (event.introduced) {
          introduced = true;
          if (this.compareVersions(version, event.introduced) >= 0) {
            isAffected = true;
          } else {
            isAffected = false;
          }
        }
        if (event.fixed) {
          if (this.compareVersions(version, event.fixed) >= 0) {
            isAffected = false;
          }
        }
        if (event.limit) {
          if (this.compareVersions(version, event.limit) >= 0) {
            isAffected = false;
          }
        }
      }

      return introduced && isAffected;
    }

    return false;
  }

  /**
   * Simple version comparison (returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2)
   * For production, use a proper semver library like 'semver'
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  }

  async getVulnerabilityById(id: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/vulns/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get vulnerability details: ${error}`);
    }
  }

  /**
   * Batch query with hybrid approach support
   */
  async batchQuery(packages: Array<PackageInfo & { isExactVersion?: boolean }>): Promise<any[]> {
    try {
      // Use batch query for exact versions
      const exactVersionPackages = packages.filter(pkg => 
        pkg.isExactVersion && !this.isVersionRange(pkg.version)
      );
      
      const rangePackages = packages.filter(pkg => 
        !pkg.isExactVersion || this.isVersionRange(pkg.version)
      );

      const results: any[] = [];

      // Batch query exact versions
      if (exactVersionPackages.length > 0) {
        const response = await axios.post(`${this.baseUrl}/v1/querybatch`, {
          queries: exactVersionPackages.map(pkg => ({
            package: {
              name: pkg.name,
              ecosystem: pkg.ecosystem
            },
            version: pkg.version
          }))
        });
        results.push(...(response.data.results || []));
      }

      // Query range-based packages individually (OSV doesn't support range queries in batch)
      for (const pkg of rangePackages) {
        try {
          const vulns = await this.queryVulnerabilitiesByRange(pkg);
          results.push({
            vulns
          });
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
