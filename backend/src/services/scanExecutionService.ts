import { OSVService } from './osvService.js';
import { SemgrepService } from './semgrepService.js';
import { TrivyService } from './trivyService.js';
import { GitHubSecurityService } from './snykService.js';
import { ZapService } from './zapService.js';

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

  constructor() {
    this.osvService = new OSVService();
    this.semgrepService = new SemgrepService(process.env.SEMGREP_API_KEY || '');
    this.trivyService = new TrivyService(process.env.TRIVY_API_URL || 'http://trivy:8080');
    this.githubService = new GitHubSecurityService(process.env.GITHUB_TOKEN);
    this.zapService = new ZapService(process.env.ZAP_API_URL || 'http://zap:8080');
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
      // Execute tools in parallel for better performance
      const toolPromises = policy.tools.map(tool => this.executeTool(tool, target, policy));
      const toolResults = await Promise.allSettled(toolPromises);

      // Process results
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

      // Calculate summary
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
      
      // Get URL from target identifiers
      const urlIdentifier = target.identifiers.find(id => id.type === 'url');
      if (!urlIdentifier) {
        console.log('No URL identifier found for ZAP scan, skipping');
        return [];
      }

      const targetUrl = urlIdentifier.value;
      const exclusions = policy.configurations?.exclusions || [];

      console.log(`Starting ZAP scan for URL: ${targetUrl} (passive-only mode)`);

      // Step 1: Start spider to discover URLs
      console.log('Step 1: Starting ZAP spider to discover URLs...');
      const spiderScanId = await this.zapService.startSpider(targetUrl);
      console.log(`ZAP spider started with ID: ${spiderScanId}`);

      // Wait for spider to complete (up to 2 minutes)
      await this.zapService.waitForScanCompletion(spiderScanId, 'spider', 120000);
      
      // Get spider results
      const spiderResults = await this.zapService.getSpiderResults();
      console.log(`Spider discovered ${spiderResults.length} URLs`);

      // Apply URL exclusions if configured
      if (exclusions.length > 0) {
        console.log(`Applying ${exclusions.length} URL exclusion patterns`);
        // Note: ZAP doesn't have a direct API to exclude URLs from scanning,
        // but we can filter alerts after scanning. For now, we log this.
        // In a production system, you'd configure ZAP context exclusions via API.
      }

      // Step 2: Passive scanning only (non-intrusive)
      console.log('Step 2: Passive scanning enabled - analyzing discovered URLs without intrusive testing');
      // Passive scanning happens automatically as traffic flows through ZAP
      // Give passive scanner time to process discovered URLs
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Get all alerts/findings
      const alerts = await this.zapService.getAlerts();
      console.log(`ZAP scan completed. Found ${alerts.length} alerts`);

      // Filter alerts based on URL exclusions
      let filteredAlerts = alerts;
      if (exclusions.length > 0) {
        filteredAlerts = alerts.filter(alert => {
          const alertUrl = alert.url || '';
          return !exclusions.some((pattern: string) => {
            // Simple pattern matching (supports * wildcards)
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(alertUrl);
          });
        });
        console.log(`Filtered ${alerts.length - filteredAlerts.length} alerts based on exclusions`);
      }

      // Transform ZAP alerts to our findings format
      return filteredAlerts.map(alert => this.transformZapAlert(alert, target.id));

    } catch (error) {
      console.error('ZAP scan failed:', error);
      return [];
    }
  }

  private transformZapAlert(zapAlert: any, targetId: string): any {
    const owaspTags = this.mapToOwaspTop10(zapAlert.cweid, zapAlert.wascid, zapAlert.name);
    
    return {
      id: `zap-finding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: zapAlert.name || 'ZAP Security Finding',
      severity: this.mapZapRiskToSeverity(zapAlert.risk),
      status: 'open',
      tool: 'ZAP',
      location: zapAlert.url || 'Unknown',
      targetId: targetId,
      firstSeenAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      description: zapAlert.description || 'Security issue detected by ZAP',
      recommendation: zapAlert.solution || 'Review and fix the identified security issue',
      confidence: this.mapZapConfidenceToConfidence(zapAlert.confidence),
      risk: zapAlert.risk || 'medium',
      cwe: zapAlert.cweid,
      wasc: zapAlert.wascid,
      reference: zapAlert.reference,
      owaspTop10Tags: owaspTags,
      rawResult: zapAlert
    };
  }

  /**
   * Maps CWE/WASC IDs and alert names to OWASP Top 10 2021 categories
   */
  private mapToOwaspTop10(cweId?: string | number, wascId?: string | number, alertName?: string): string[] {
    const tags: string[] = [];
    const cwe = cweId ? String(cweId) : '';
    const wasc = wascId ? String(wascId) : '';
    const name = (alertName || '').toLowerCase();

    // CWE to OWASP Top 10 mapping
    const cweToOwasp: Record<string, string[]> = {
      // A01: Broken Access Control
      '284': ['A01'], // Improper Access Control
      '285': ['A01'], // Improper Authorization
      '639': ['A01'], // Authorization Bypass Through User-Controlled Key
      '306': ['A01'], // Missing Authentication for Critical Function
      
      // A02: Cryptographic Failures
      '327': ['A02'], // Use of a Broken or Risky Cryptographic Algorithm
      '326': ['A02'], // Inadequate Encryption Strength
      '330': ['A02'], // Use of Insufficiently Random Values
      '759': ['A02'], // Use of a One-Way Hash without a Salt
      '760': ['A02'], // Use of a One-Way Hash with a Predictable Salt
      
      // A03: Injection
      '89': ['A03'], // SQL Injection
      '78': ['A03'], // OS Command Injection
      '79': ['A03'], // Cross-site Scripting (XSS)
      '91': ['A03'], // XML Injection
      '564': ['A03'], // SQL Injection: Hibernate
      '943': ['A03'], // Improper Neutralization of Special Elements in Data Query Logic
      '917': ['A03'], // Expression Language Injection
      
      // A04: Insecure Design (hard to detect automatically, but some patterns)
      '693': ['A04'], // Protection Mechanism Failure
      
      // A05: Security Misconfiguration
      '16': ['A05'], // Configuration
      '209': ['A05'], // Information Exposure Through an Error Message
      '215': ['A05'], // Information Exposure Through Debug Information
      '538': ['A05'], // File and Directory Information Exposure
      
      // A06: Vulnerable Components (handled by OSV/Trivy, but some CWEs apply)
      '1104': ['A06'], // Use of Unmaintained Third-Party Components
      
      // A07: Authentication Failures
      '287': ['A07'], // Improper Authentication
      '306': ['A07'], // Missing Authentication for Critical Function
      '798': ['A07'], // Use of Hard-coded Credentials
      '256': ['A07'], // Plaintext Storage of a Password
      '521': ['A07'], // Weak Password Requirements
      '307': ['A07'], // Improper Restriction of Excessive Authentication Attempts
      
      // A08: Software Integrity Failures
      '494': ['A08'], // Download of Code Without Integrity Check
      '502': ['A08'], // Deserialization of Untrusted Data
      '829': ['A08'], // Inclusion of Functionality from Untrusted Control Sphere
      
      // A09: Logging Failures
      '778': ['A09'], // Insufficient Logging
      '117': ['A09'], // Improper Output Neutralization for Logs
      
      // A10: SSRF
      '918': ['A10'], // Server-Side Request Forgery (SSRF)
    };

    // WASC to OWASP Top 10 mapping
    const wascToOwasp: Record<string, string[]> = {
      '1': ['A03'], // Insufficient Authentication
      '2': ['A07'], // Insufficient Authorization
      '3': ['A03'], // Integer Overflow
      '4': ['A03'], // Insufficient Input Validation
      '5': ['A03'], // Remote File Inclusion
      '6': ['A03'], // Path Traversal
      '7': ['A03'], // Predictable Resource Location
      '8': ['A03'], // Cross-Site Request Forgery
      '9': ['A03'], // Cross-Site Scripting
      '10': ['A03'], // Denial of Service
      '11': ['A03'], // SQL Injection
      '12': ['A03'], // LDAP Injection
      '13': ['A03'], // XPath Injection
      '14': ['A03'], // XML Injection
      '15': ['A03'], // Command Injection
      '19': ['A05'], // SQL Injection
      '20': ['A03'], // Improper Input Handling
      '21': ['A03'], // Insufficient Verification of Data Authenticity
      '22': ['A03'], // URL Redirector Abuse
      '23': ['A03'], // Improper Restriction of XML External Entity Reference
      '24': ['A03'], // HTTP Request Splitting
      '25': ['A03'], // HTTP Response Splitting
      '26': ['A03'], // HTTP Header Injection
      '27': ['A03'], // HTTP Response Smuggling
      '28': ['A03'], // Null Byte Injection
      '29': ['A03'], // LDAP Injection
      '30': ['A03'], // Mail Command Injection
      '31': ['A03'], // SSI Injection
      '32': ['A03'], // XPath Injection
      '33': ['A03'], // XQuery Injection
      '34': ['A03'], // Code Injection
      '35': ['A03'], // XSLT Injection
      '36': ['A03'], // HTTP Header Injection
      '37': ['A03'], // HTTP Response Splitting
      '38': ['A03'], // HTTP Request Smuggling
      '39': ['A03'], // HTTP Response Smuggling
      '40': ['A03'], // HTTP Header Injection
      '41': ['A03'], // HTTP Response Splitting
      '42': ['A03'], // HTTP Request Smuggling
      '43': ['A03'], // HTTP Response Smuggling
      '44': ['A03'], // HTTP Header Injection
      '45': ['A03'], // HTTP Response Splitting
      '46': ['A03'], // HTTP Request Smuggling
      '47': ['A03'], // HTTP Response Smuggling
      '48': ['A10'], // Server-Side Request Forgery
    };

    // Add CWE-based tags
    if (cwe && cweToOwasp[cwe]) {
      tags.push(...cweToOwasp[cwe]);
    }

    // Add WASC-based tags
    if (wasc && wascToOwasp[wasc]) {
      tags.push(...wascToOwasp[wasc]);
    }

    // Name-based heuristics (fallback if CWE/WASC not available)
    if (tags.length === 0) {
      if (name.includes('sql injection') || name.includes('sqli')) {
        tags.push('A03');
      } else if (name.includes('xss') || name.includes('cross-site scripting')) {
        tags.push('A03');
      } else if (name.includes('csrf') || name.includes('cross-site request forgery')) {
        tags.push('A01');
      } else if (name.includes('authentication') || name.includes('auth')) {
        tags.push('A07');
      } else if (name.includes('authorization') || name.includes('access control')) {
        tags.push('A01');
      } else if (name.includes('ssrf') || name.includes('server-side request forgery')) {
        tags.push('A10');
      } else if (name.includes('injection')) {
        tags.push('A03');
      } else if (name.includes('misconfiguration') || name.includes('configuration')) {
        tags.push('A05');
      } else if (name.includes('crypto') || name.includes('encryption') || name.includes('ssl') || name.includes('tls')) {
        tags.push('A02');
      }
    }

    // Remove duplicates
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
      
      // Find package identifiers
      const packageIdentifiers = target.identifiers.filter(id => 
        id.type === 'npm' || id.type === 'pypi' || id.type === 'maven'
      );

      if (packageIdentifiers.length === 0) {
        console.log('No package identifiers found for OSV scan, skipping');
        return [];
      }

      const findings: any[] = [];

      for (const pkg of packageIdentifiers) {
        try {
          // Parse package info (simplified - assumes format like "package@version")
          const [name, version] = pkg.value.split('@');
          const ecosystem = this.mapIdentifierTypeToEcosystem(pkg.type);

          const vulnerabilities = await this.osvService.queryVulnerabilities({
            name,
            version: version || 'latest',
            ecosystem
          });

          // Convert OSV vulnerabilities to findings
          vulnerabilities.forEach((vuln, index) => {
            findings.push({
              id: `osv-finding-${Date.now()}-${index}`,
              title: vuln.summary || 'Dependency Vulnerability',
              severity: this.mapOSVSeverityToSeverity(vuln.severity),
              status: 'open',
              tool: 'OSV',
              location: `${name}@${version}`,
              targetId: target.id,
              firstSeenAt: new Date().toISOString(),
              lastUpdatedAt: new Date().toISOString(),
              description: vuln.summary || 'Vulnerability in dependency',
              recommendation: 'Update to a secure version of the dependency',
              cve: vuln.id,
              ecosystem,
              package: name,
              version,
              owaspTop10Tags: ['A06'] // Vulnerable Components
            });
          });

        } catch (error) {
          console.error(`OSV scan failed for package ${pkg.value}:`, error);
        }
      }

      return findings;

    } catch (error) {
      console.error('OSV scan failed:', error);
      throw error;
    }
  }

  private async executeSemgrepScan(target: ScanTarget, policy: ScanPolicy): Promise<any[]> {
    try {
      // Check if API key is available
      if (!process.env.SEMGREP_API_KEY) {
        console.log('Semgrep API key not configured, skipping scan');
        return [];
      }

      console.log(`Starting Semgrep scan for target: ${target.id}`);
      
      // Find repository identifier
      const repoIdentifier = target.identifiers.find(id => id.type === 'repository');
      if (!repoIdentifier) {
        throw new Error('No repository identifier found for Semgrep scan');
      }

      const scanResult = await this.semgrepService.scanRepository(
        repoIdentifier.value,
        policy.configurations?.ruleset || 'p/security-audit'
      );

      // Wait for scan to complete and get results
      const results = await this.semgrepService.getScanResults(scanResult.scan_id);

      // Convert Semgrep results to findings
      return results.map((result, index) => {
        const checkId = (result.check_id || '').toLowerCase();
        const message = (result.message || '').toLowerCase();
        let owaspTags: string[] = [];
        
        // Map common Semgrep rules to OWASP Top 10
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
          // Default to A03 for most code issues
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
      
      // Find container/image identifiers
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
          
          // Convert Trivy results to findings
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
                owaspTop10Tags: ['A06'] // Vulnerable Components
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
      // Check if GitHub token is available
      if (!process.env.GITHUB_TOKEN) {
        console.log('GitHub token not configured, skipping scan');
        return [];
      }

      console.log(`Starting GitHub security scan for target: ${target.id}`);
      
      // Find repository identifier
      const repoIdentifier = target.identifiers.find(id => id.type === 'repository');
      if (!repoIdentifier) {
        throw new Error('No repository identifier found for GitHub scan');
      }

      // Parse repository (assumes format like "owner/repo")
      const [owner, repo] = repoIdentifier.value.split('/');
      if (!owner || !repo) {
        throw new Error('Invalid repository format. Expected "owner/repo"');
      }

      const advisories = await this.githubService.getSecurityAdvisories(owner, repo);

      // Convert GitHub advisories to findings
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
        owaspTop10Tags: ['A06', 'A08'] // Vulnerable Components and Software Integrity
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

  // Severity mapping functions
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
