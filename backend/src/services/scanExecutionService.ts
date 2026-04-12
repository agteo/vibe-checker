import { OSVService } from './osvService.js';
import { SemgrepService } from './semgrepService.js';
import { TrivyService } from './trivyService.js';
import { GitHubSecurityService } from './snykService.js';
import { ZapService } from './zapService.js';
import { PackageVersionService } from './packageVersionService.js';
import path from 'path';
import fs from 'fs/promises';

export interface ScanTarget {
  id: string;
  name: string;
  url?: string;
  repository?: string;
  identifiers: {
    type: string;
    value: string;
  }[];
}

export interface ScanPolicy {
  id: string;
  name: string;
  tools: string[];
  configurations: Record<string, any>;
}

export interface ScanResult {
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  finishedAt?: string;
  tools: string[];
  findings: any[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  errors?: string[];
}

export class ScanExecutionService {
  private osvService: OSVService;
  private semgrepService: SemgrepService;
  private trivyService: TrivyService;
  private githubService: GitHubSecurityService;
  private zapService: ZapService;
  private packageVersionService: PackageVersionService;

  constructor() {
    this.osvService = new OSVService();
    this.semgrepService = new SemgrepService(process.env.SEMGREP_API_KEY || '');
    this.trivyService = new TrivyService(process.env.TRIVY_API_URL || 'http://trivy:8080');
    this.githubService = new GitHubSecurityService(process.env.GITHUB_TOKEN);
    this.zapService = new ZapService(process.env.ZAP_API_URL || 'http://zap:8080');
    this.packageVersionService = new PackageVersionService();
  }

  async executeScan(
    jobId: string,
    target: ScanTarget,
    policy: ScanPolicy
  ): Promise<ScanResult> {
    console.log(`Starting scan execution for job ${jobId}`);
    console.log(`Target:`, target);
    console.log(`Policy:`, policy);
    
    const result: ScanResult = {
      jobId,
      status: 'running',
      startedAt: new Date().toISOString(),
      tools: policy.tools,
      findings: [],
      summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
      errors: []
    };

    try {
      const toolPromises = policy.tools.map(tool => this.executeTool(tool, target, policy));
      const toolResults = await Promise.allSettled(toolPromises);

      toolResults.forEach((toolResult, index) => {
        const tool = policy.tools[index];
        
        if (toolResult.status === 'fulfilled') {
          const findings = toolResult.value;
          result.findings.push(...findings);
          console.log(`Tool ${tool} completed with ${findings.length} findings`);
        } else {
          const error = `Tool ${tool} failed: ${toolResult.reason}`;
          console.error(error);
          result.errors?.push(error);
        }
      });

      result.summary = this.calculateSummary(result.findings);
      result.status = 'completed';
      result.finishedAt = new Date().toISOString();

      console.log(`Scan ${jobId} completed with ${result.findings.length} findings`);
      return result;

    } catch (error) {
      console.error(`Scan ${jobId} failed:`, error);
      result.status = 'failed';
      result.finishedAt = new Date().toISOString();
      result.errors?.push(`Scan execution failed: ${error}`);
      return result;
    }
  }

  private async executeTool(
    tool: string,
    target: ScanTarget,
    policy: ScanPolicy
  ): Promise<any[]> {
    console.log(`Executing tool: ${tool} for target: ${target.id}`);

    switch (tool.toLowerCase()) {
      case 'zap':
        return await this.executeZapScan(target, policy);
      case 'osv':
        return await this.executeOSVScan(target, policy);
      case 'semgrep':
        return await this.executeSemgrepScan(target, policy);
      case 'trivy':
        return await this.executeTrivyScan(target, policy);
      case 'github':
        return await this.executeGitHubScan(target, policy);
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }

  private async executeZapScan(target: ScanTarget, policy: ScanPolicy): Promise<any[]> {
    try {
      console.log(`Executing ZAP scan for target: ${target.id}`);
      
      const urlIdentifier = target.identifiers.find(id => id.type === 'url');
      if (!urlIdentifier) {
        console.log('No URL identifier found for ZAP scan, skipping');
        return [];
      }

      const targetUrl = urlIdentifier.value;
      const exclusions = policy.configurations?.exclusions || [];

      console.log(`Starting ZAP scan for URL: ${targetUrl} (passive-only mode)`);
      console.log('Step 1: Starting ZAP spider to discover URLs...');
      const spiderScanId = await this.zapService.startSpider(targetUrl);
      console.log(`ZAP spider started with ID: ${spiderScanId}`);

      await this.zapService.waitForScanCompletion(spiderScanId, 'spider', 120000);
      
      const spiderResults = await this.zapService.getSpiderResults();
      console.log(`Spider discovered ${spiderResults.length} URLs`);

      const filteredUrls = spiderResults.filter(url => {
        return !exclusions.some((pattern: string) => {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(url);
        });
      });

      console.log(`After exclusions: ${filteredUrls.length} URLs to scan`);
      console.log('Step 2: Running passive scan on discovered URLs...');
      for (const url of filteredUrls.slice(0, policy.configurations?.spiderDepth || 10)) {
        try {
          await this.zapService.accessUrl(url);
        } catch (error) {
          console.warn(`Failed to access ${url}: ${error}`);
        }
      }

      console.log('Step 3: Collecting passive scan alerts...');
      const alerts = await this.zapService.getAlerts();
      console.log(`ZAP found ${alerts.length} alerts`);

      return alerts.map((alert, index) => ({
        id: `zap-finding-${Date.now()}-${index}`,
        title: alert.name || 'Web Security Issue',
        severity: this.mapZapRiskToSeverity(alert.risk),
        status: 'open',
        tool: 'ZAP',
        location: alert.url || targetUrl,
        targetId: target.id,
        firstSeenAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        description: alert.description || 'Security issue detected in web application',
        recommendation: alert.solution || 'Review and address the identified security issue',
        confidence: this.mapZapConfidenceToConfidence(alert.confidence),
        cwe: alert.cweid,
        wasc: alert.wascid,
        owaspTop10Tags: this.mapToOwaspTop10(alert.name || '', alert.cweid, alert.wascid)
      }));

    } catch (error) {
      console.error('ZAP scan failed:', error);
      throw error;
    }
  }

  private mapToOwaspTop10(name: string, cwe?: string, wasc?: string): string[] {
    const tags: string[] = [];
    const cweToOwasp: Record<string, string[]> = {
      '22': ['A01'],
      '352': ['A01'],
      '862': ['A01'],
      '863': ['A01'],
      '639': ['A01'],
      '259': ['A02'],
      '327': ['A02'],
      '328': ['A02'],
      '319': ['A02'],
      '79': ['A03'],
      '89': ['A03'],
      '77': ['A03'],
      '78': ['A03'],
      '90': ['A03'],
      '91': ['A03'],
      '943': ['A03'],
      '209': ['A04'],
      '285': ['A04'],
      '16': ['A05'],
      '611': ['A05'],
      '276': ['A05'],
      '732': ['A05'],
      '1104': ['A06'],
      '287': ['A07'],
      '307': ['A07'],
      '494': ['A08'],
      '502': ['A08'],
      '829': ['A08'],
      '778': ['A09'],
      '117': ['A09'],
      '918': ['A10'],
    };

    const wascToOwasp: Record<string, string[]> = {
      '1': ['A03'], '2': ['A07'], '3': ['A03'], '4': ['A03'], '5': ['A03'],
      '6': ['A03'], '7': ['A03'], '8': ['A03'], '9': ['A03'], '10': ['A03'],
      '11': ['A03'], '12': ['A03'], '13': ['A03'], '14': ['A03'], '15': ['A03'],
      '19': ['A05'], '20': ['A03'], '21': ['A03'], '22': ['A03'], '23': ['A03'],
      '24': ['A03'], '25': ['A03'], '26': ['A03'], '27': ['A03'], '28': ['A03'],
      '29': ['A03'], '30': ['A03'], '31': ['A03'], '32': ['A03'], '33': ['A03'],
      '34': ['A03'], '35': ['A03'], '36': ['A03'], '37': ['A03'], '38': ['A03'],
      '39': ['A03'], '40': ['A03'], '41': ['A03'], '42': ['A03'], '43': ['A03'],
      '44': ['A03'], '45': ['A03'], '46': ['A03'], '47': ['A03'], '48': ['A10'],
    };

    if (cwe && cweToOwasp[cwe]) tags.push(...cweToOwasp[cwe]);
    if (wasc && wascToOwasp[wasc]) tags.push(...wascToOwasp[wasc]);

    if (tags.length === 0) {
      if (name.includes('sql injection') || name.includes('sqli')) tags.push('A03');
      else if (name.includes('xss') || name.includes('cross-site scripting')) tags.push('A03');
      else if (name.includes('csrf') || name.includes('cross-site request forgery')) tags.push('A01');
      else if (name.includes('authentication') || name.includes('auth')) tags.push('A07');
      else if (name.includes('authorization') || name.includes('access control')) tags.push('A01');
      else if (name.includes('ssrf') || name.includes('server-side request forgery')) tags.push('A10');
      else if (name.includes('injection')) tags.push('A03');
      else if (name.includes('misconfiguration') || name.includes('configuration')) tags.push('A05');
      else if (name.includes('crypto') || name.includes('encryption') || name.includes('ssl') || name.includes('tls')) tags.push('A02');
    }

    return [...new Set(tags)];
  }

  private mapZapRiskToSeverity(zapRisk: string): string {
    const riskMap: Record<string, string> = {
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low',
      'Informational': 'info'
    };
    return riskMap[zapRisk] || 'medium';
  }

  private mapZapConfidenceToConfidence(zapConfidence: string): string {
    const confidenceMap: Record<string, string> = {
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low'
    };
    return confidenceMap[zapConfidence] || 'medium';
  }

  private async executeOSVScan(target: ScanTarget, policy: ScanPolicy): Promise<any[]> {
    try {
      console.log(`Starting OSV scan for target: ${target.id}`);
      console.log(`Target identifiers:`, target.identifiers);
      
      const findings: any[] = [];
      const packagesToScan: Array<{
        name: string;
        version: string;
        ecosystem: string;
        isExactVersion: boolean;
        isDirect: boolean;
        source: string;
      }> = [];

      const repoPathIdentifier = target.identifiers.find(id => 
        id.type === 'repository' || id.type === 'filepath'
      );

      if (repoPathIdentifier) {
        try {
          const repoPath = repoPathIdentifier.value;
          const ecosystems: Array<'npm' | 'pypi' | 'maven'> = ['npm', 'pypi', 'maven'];
          
          for (const ecosystem of ecosystems) {
            const versionResult = await this.packageVersionService.extractPackageVersions(repoPath, ecosystem);

            if (versionResult.packages.length > 0) {
              console.log(`Found ${versionResult.packages.length} packages from ${versionResult.source} (${ecosystem})`);
              
              versionResult.packages.forEach(pkg => {
                packagesToScan.push({
                  name: pkg.name,
                  version: pkg.version,
                  ecosystem: pkg.ecosystem,
                  isExactVersion: pkg.source === 'lockfile',
                  isDirect: pkg.isDirect,
                  source: `${pkg.source} (${ecosystem})`
                });
              });
              
              break;
            }
          }
        } catch (error) {
          console.warn(`Failed to extract packages from repository path: ${error}`);
        }
      }

      const packageIdentifiers = target.identifiers.filter(id => 
        id.type === 'npm' || id.type === 'pypi' || id.type === 'maven'
      );

      for (const pkgIdentifier of packageIdentifiers) {
        const ecosystem = this.mapIdentifierTypeToEcosystem(pkgIdentifier.type) as 'npm' | 'pypi' | 'maven';
        const parsed = this.packageVersionService.parsePackageIdentifier(pkgIdentifier.value, ecosystem);

        if (parsed) {
          const existing = packagesToScan.find(
            p => p.name === parsed.name && p.ecosystem === parsed.ecosystem
          );

          if (!existing) {
            packagesToScan.push({
              name: parsed.name,
              version: parsed.version,
              ecosystem: parsed.ecosystem,
              isExactVersion: !this.isVersionRange(parsed.version),
              isDirect: true,
              source: 'identifier'
            });
          }
        }
      }

      if (packagesToScan.length === 0) {
        console.log('No packages found for OSV scan, skipping');
        return [];
      }

      console.log(`Scanning ${packagesToScan.length} packages (${packagesToScan.filter(p => p.isExactVersion).length} exact versions)`);

      for (const pkg of packagesToScan) {
        try {
          const vulnerabilities = await this.osvService.queryVulnerabilitiesHybrid(
            { name: pkg.name, version: pkg.version, ecosystem: pkg.ecosystem },
            pkg.isExactVersion
          );

          vulnerabilities.forEach((vuln, index) => {
            findings.push({
              id: `osv-finding-${Date.now()}-${pkg.name}-${index}`,
              title: vuln.summary || 'Dependency Vulnerability',
              severity: this.mapOSVSeverityToSeverity(vuln.severity),
              status: 'open',
              tool: 'OSV',
              location: `${pkg.name}@${pkg.version}`,
              targetId: target.id,
              firstSeenAt: new Date().toISOString(),
              lastUpdatedAt: new Date().toISOString(),
              description: vuln.summary || vuln.details || 'Vulnerability in dependency',
              recommendation: this.generateRecommendation(pkg, vuln),
              cve: vuln.id,
              ecosystem: pkg.ecosystem,
              package: pkg.name,
              version: pkg.version,
              isDirect: pkg.isDirect,
              source: pkg.source,
              confidence: pkg.isExactVersion ? 'high' : 'medium',
              owaspTop10Tags: ['A06']
            });
          });

        } catch (error) {
          console.error(`OSV scan failed for package ${pkg.name}@${pkg.version}:`, error);
        }
      }

      console.log(`OSV scan completed with ${findings.length} findings`);
      return findings;

    } catch (error) {
      console.error('OSV scan failed:', error);
      throw error;
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

  private generateRecommendation(
    pkg: { name: string; version: string; isExactVersion: boolean },
    vuln: any
  ): string {
    if (pkg.isExactVersion) {
      return `Update ${pkg.name} to a patched version. Current version ${pkg.version} is vulnerable.`;
    } else {
      return `Verify the exact installed version of ${pkg.name}. The version range ${pkg.version} may include vulnerable versions. Check package-lock.json for the exact version.`;
    }
  }

  private async executeSemgrepScan(target: ScanTarget, policy: ScanPolicy): Promise<any[]> {
    try {
      if (!process.env.SEMGREP_API_KEY) {
        console.log('Semgrep API key not configured, skipping scan');
        return [];
      }

      console.log(`Starting Semgrep scan for target: ${target.id}`);
      
      const repoIdentifier = target.identifiers.find(id => id.type === 'repository');
      if (!repoIdentifier) {
        throw new Error('No repository identifier found for Semgrep scan');
      }

      const scanResult = await this.semgrepService.scanRepository(
        repoIdentifier.value,
        policy.configurations?.ruleset || 'p/security-audit'
      );

      const results = await this.semgrepService.getScanResults(scanResult.scan_id);

      return results.map((result, index) => {
        const checkId = (result.check_id || '').toLowerCase();
        const message = (result.message || '').toLowerCase();
        let owaspTags: string[] = [];
        
        if (checkId.includes('sql') || checkId.includes('injection') || message.includes('sql injection')) {
          owaspTags.push('A03');
        } else if (checkId.includes('xss') || message.includes('xss') || message.includes('cross-site scripting')) {
          owaspTags.push('A03');
        } else if (checkId.includes('auth') || message.includes('authentication')) {
          owaspTags.push('A07');
        } else if (checkId.includes('crypto') || message.includes('encryption') || message.includes('cipher')) {
          owaspTags.push('A02');
        } else if (checkId.includes('log') || message.includes('logging')) {
          owaspTags.push('A09');
        } else {
          owaspTags.push('A03');
        }
        
        return {
          id: `semgrep-finding-${Date.now()}-${index}`,
          title: result.check_id || 'Code Security Issue',
          severity: this.mapSemgrepSeverityToSeverity(result.severity),
          status: 'open',
          tool: 'Semgrep',
          location: `${result.path}:${result.start?.line || 0}`,
          targetId: target.id,
          firstSeenAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
          description: result.message || 'Security issue detected in code',
          recommendation: 'Review and fix the identified code security issue',
          rule: result.check_id,
          confidence: result.confidence,
          owaspTop10Tags: owaspTags
        };
      });

    } catch (error) {
      console.error('Semgrep scan failed:', error);
      throw error;
    }
  }

  private async executeTrivyScan(target: ScanTarget, policy: ScanPolicy): Promise<any[]> {
    try {
      console.log(`Starting Trivy scan for target: ${target.id}`);
      
      const containerIdentifiers = target.identifiers.filter(id => 
        id.type === 'container' || id.type === 'image'
      );

      if (containerIdentifiers.length === 0) {
        console.log('No container identifiers found for Trivy scan');
        return [];
      }

      const findings: any[] = [];

      for (const container of containerIdentifiers) {
        try {
          const scanResult = await this.trivyService.scanImage(container.value);
          
          if (scanResult.vulnerabilities) {
            scanResult.vulnerabilities.forEach((vuln, index) => {
              findings.push({
                id: `trivy-finding-${Date.now()}-${index}`,
                title: vuln.title || 'Container Vulnerability',
                severity: this.mapTrivySeverityToSeverity(vuln.severity),
                status: 'open',
                tool: 'Trivy',
                location: `${container.value}:${vuln.package_name}@${vuln.installed_version}`,
                targetId: target.id,
                firstSeenAt: new Date().toISOString(),
                lastUpdatedAt: new Date().toISOString(),
                description: vuln.description || 'Vulnerability in container image',
                recommendation: 'Update the vulnerable package or base image',
                cve: vuln.vulnerability_id,
                package: vuln.package_name,
                version: vuln.installed_version,
                owaspTop10Tags: ['A06']
              });
            });
          }

        } catch (error) {
          console.error(`Trivy scan failed for container ${container.value}:`, error);
        }
      }

      return findings;

    } catch (error) {
      console.error('Trivy scan failed:', error);
      throw error;
    }
  }

  private async executeGitHubScan(target: ScanTarget, policy: ScanPolicy): Promise<any[]> {
    try {
      if (!process.env.GITHUB_TOKEN) {
        console.log('GitHub token not configured, skipping scan');
        return [];
      }

      console.log(`Starting GitHub security scan for target: ${target.id}`);
      
      const repoIdentifier = target.identifiers.find(id => id.type === 'repository');
      if (!repoIdentifier) {
        throw new Error('No repository identifier found for GitHub scan');
      }

      const [owner, repo] = repoIdentifier.value.split('/');
      if (!owner || !repo) {
        throw new Error('Invalid repository format. Expected "owner/repo"');
      }

      const advisories = await this.githubService.getSecurityAdvisories(owner, repo);

      return advisories.map((advisory, index) => ({
        id: `github-finding-${Date.now()}-${index}`,
        title: advisory.summary || 'GitHub Security Advisory',
        severity: this.mapGitHubSeverityToSeverity(advisory.severity),
        status: 'open',
        tool: 'GitHub',
        location: `${owner}/${repo}`,
        targetId: target.id,
        firstSeenAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        description: advisory.summary || 'Security advisory from GitHub',
        recommendation: 'Review and address the security advisory',
        ghsa: advisory.ghsa_id,
        cve: advisory.cve_id,
        owaspTop10Tags: ['A06', 'A08']
      }));

    } catch (error) {
      console.error('GitHub scan failed:', error);
      throw error;
    }
  }

  private calculateSummary(findings: any[]): ScanResult['summary'] {
    return {
      total: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length
    };
  }

  private mapOSVSeverityToSeverity(severity: any): string {
    if (!severity || !Array.isArray(severity)) return 'medium';
    
    const highestSeverity = severity.reduce((highest, s) => {
      const score = s.score || 0;
      return score > (highest.score || 0) ? s : highest;
    }, { score: 0 });

    if (highestSeverity.score >= 9) return 'critical';
    if (highestSeverity.score >= 7) return 'high';
    if (highestSeverity.score >= 4) return 'medium';
    return 'low';
  }

  private mapSemgrepSeverityToSeverity(severity: string): string {
    const severityMap: Record<string, string> = {
      'ERROR': 'high',
      'WARNING': 'medium',
      'INFO': 'low'
    };
    return severityMap[severity] || 'medium';
  }

  private mapTrivySeverityToSeverity(severity: string): string {
    const severityMap: Record<string, string> = {
      'CRITICAL': 'critical',
      'HIGH': 'high',
      'MEDIUM': 'medium',
      'LOW': 'low',
      'UNKNOWN': 'low'
    };
    return severityMap[severity] || 'medium';
  }

  private mapGitHubSeverityToSeverity(severity: string): string {
    const severityMap: Record<string, string> = {
      'critical': 'critical',
      'high': 'high',
      'moderate': 'medium',
      'low': 'low'
    };
    return severityMap[severity] || 'medium';
  }

  private mapIdentifierTypeToEcosystem(type: string): string {
    const ecosystemMap: Record<string, string> = {
      'npm': 'npm',
      'pypi': 'PyPI',
      'maven': 'Maven',
      'cargo': 'crates.io',
      'go': 'Go'
    };
    return ecosystemMap[type] || type;
  }
}
