import { NucleiService } from './nucleiService.js';
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
  private nucleiService: NucleiService;
  private osvService: OSVService;
  private semgrepService: SemgrepService;
  private trivyService: TrivyService;
  private githubService: GitHubSecurityService;
  private zapService: ZapService;

  constructor() {
    this.nucleiService = new NucleiService('vibe-check-nuclei-1');
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
      case 'nuclei':
        return await this.executeNucleiScan(target, policy);
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
      console.log(`Starting comprehensive ZAP scan for URL: ${targetUrl}`);

      // Step 1: Start spider to discover URLs
      console.log('Step 1: Starting ZAP spider to discover URLs...');
      const spiderScanId = await this.zapService.startSpider(targetUrl);
      console.log(`ZAP spider started with ID: ${spiderScanId}`);

      // Wait for spider to complete (up to 2 minutes)
      await this.zapService.waitForScanCompletion(spiderScanId, 'spider', 120000);
      
      // Get spider results
      const spiderResults = await this.zapService.getSpiderResults();
      console.log(`Spider discovered ${spiderResults.length} URLs`);

      // Step 2: Start active scan for vulnerability testing
      // Passive scanning happens automatically as traffic flows through ZAP
      console.log('Step 2: Starting ZAP active scan...');
      const activeScanId = await this.zapService.startActiveScan(targetUrl);
      console.log(`ZAP active scan started with ID: ${activeScanId}`);

      // Wait for active scan to complete (up to 30 minutes for comprehensive scanning)
      await this.zapService.waitForScanCompletion(activeScanId, 'active', 1800000);

      // Get all alerts/findings
      const alerts = await this.zapService.getAlerts();
      console.log(`ZAP comprehensive scan completed. Found ${alerts.length} alerts`);

      // Transform ZAP alerts to our findings format
      return alerts.map(alert => this.transformZapAlert(alert, target.id));

    } catch (error) {
      console.error('ZAP scan failed:', error);
      return [];
    }
  }

  private transformZapAlert(zapAlert: any, targetId: string): any {
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
      rawResult: zapAlert
    };
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

  private async executeNucleiScan(target: ScanTarget, policy: ScanPolicy): Promise<any[]> {
    try {
      console.log(`Executing Nuclei scan for target: ${target.id}`);
      console.log(`Target identifiers:`, target.identifiers);
      
      // Find URL identifier
      const urlIdentifier = target.identifiers.find(id => id.type === 'url');
      if (!urlIdentifier) {
        console.log('No URL identifier found for Nuclei scan, skipping');
        return [];
      }

      console.log(`Starting Nuclei scan for URL: ${urlIdentifier.value}`);
      
      // Test Nuclei connectivity first
      const isConnected = await this.nucleiService.testConnection();
      if (!isConnected) {
        console.error('Nuclei is not accessible, skipping scan');
        return [];
      }

      // Execute Nuclei scan
      const findings = await this.nucleiService.scanUrl(urlIdentifier.value, {
        severity: ['critical', 'high', 'medium', 'low'],
        timeout: 60,
        rateLimit: 50
      });

      // Set target ID for all findings
      findings.forEach(finding => {
        finding.targetId = target.id;
      });

      console.log(`Nuclei scan completed with ${findings.length} findings`);
      return findings;

    } catch (error) {
      console.error('Nuclei scan failed:', error);
      throw error;
    }
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
              version
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
      return results.map((result, index) => ({
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
        confidence: result.confidence
      }));

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
                version: vuln.installed_version
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
        cve: advisory.cve_id
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
