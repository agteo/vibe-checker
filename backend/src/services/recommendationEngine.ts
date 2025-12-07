export interface RecommendationContext {
  findingType: string;
  severity: string;
  tool: string;
  targetType: string;
  businessContext?: string;
}

export interface ActionStep {
  id: string;
  title: string;
  description: string;
  priority: string;
  estimatedTime: string;
  requiredSkills: string[];
  resources: string[];
  dependencies?: string[];
  completed: boolean;
}

export enum FindingPriority {
  P0 = 'p0', // Critical - Fix immediately
  P1 = 'p1', // High - Fix within 24 hours
  P2 = 'p2', // Medium - Fix within 1 week
  P3 = 'p3', // Low - Fix within 1 month
  P4 = 'p4', // Info - Monitor/Review
}

export enum FindingUrgency {
  Immediate = 'immediate', // Fix now
  High = 'high', // Fix today
  Medium = 'medium', // Fix this week
  Low = 'low', // Fix this month
  Monitor = 'monitor', // Monitor only
}

export enum RemediationEffort {
  Low = 'low', // < 1 hour
  Medium = 'medium', // 1-8 hours
  High = 'high', // 1-3 days
  VeryHigh = 'very_high', // > 3 days
}

export class RecommendationEngine {
  
  /**
   * Generate comprehensive recommendations for a finding
   */
  generateRecommendations(finding: any, context: RecommendationContext): {
    priority: FindingPriority;
    urgency: FindingUrgency;
    actionPlan: ActionStep[];
    businessImpact: string;
    technicalImpact: string;
    remediationEffort: RemediationEffort;
    nextSteps: string[];
  } {
    const baseRecommendation = this.getBaseRecommendation(finding, context);
    const actionPlan = this.generateActionPlan(finding, context);
    
    return {
      priority: baseRecommendation.priority,
      urgency: baseRecommendation.urgency,
      actionPlan,
      businessImpact: baseRecommendation.businessImpact,
      technicalImpact: baseRecommendation.technicalImpact,
      remediationEffort: baseRecommendation.remediationEffort,
      nextSteps: baseRecommendation.nextSteps
    };
  }

  private getBaseRecommendation(finding: any, context: RecommendationContext) {
    const severity = finding.severity.toLowerCase();
    const tool = finding.tool.toLowerCase();
    const findingType = context.findingType.toLowerCase();

    // Priority mapping based on severity and context
    let priority: FindingPriority;
    let urgency: FindingUrgency;
    let remediationEffort: RemediationEffort;

    // Determine priority and urgency
    if (severity === 'critical') {
      priority = FindingPriority.P0;
      urgency = FindingUrgency.Immediate;
    } else if (severity === 'high') {
      priority = FindingPriority.P1;
      urgency = FindingUrgency.High;
    } else if (severity === 'medium') {
      priority = FindingPriority.P2;
      urgency = FindingUrgency.Medium;
    } else if (severity === 'low') {
      priority = FindingPriority.P3;
      urgency = FindingUrgency.Low;
    } else {
      priority = FindingPriority.P4;
      urgency = FindingUrgency.Monitor;
    }

    // Adjust based on finding type
    if (findingType.includes('injection') || findingType.includes('xss') || findingType.includes('rce')) {
      priority = FindingPriority.P0;
      urgency = FindingUrgency.Immediate;
    } else if (findingType.includes('authentication') || findingType.includes('authorization')) {
      if (priority === FindingPriority.P2) priority = FindingPriority.P1;
      if (urgency === FindingUrgency.Medium) urgency = FindingUrgency.High;
    }

    // Determine remediation effort
    if (findingType.includes('configuration') || findingType.includes('header')) {
      remediationEffort = RemediationEffort.Low;
    } else if (findingType.includes('dependency') || findingType.includes('library')) {
      remediationEffort = RemediationEffort.Medium;
    } else if (findingType.includes('code') || findingType.includes('logic')) {
      remediationEffort = RemediationEffort.High;
    } else {
      remediationEffort = RemediationEffort.Medium;
    }

    return {
      priority,
      urgency,
      remediationEffort,
      businessImpact: this.getBusinessImpact(finding, context),
      technicalImpact: this.getTechnicalImpact(finding, context),
      nextSteps: this.getNextSteps(finding, context)
    };
  }

  private getBusinessImpact(finding: any, context: RecommendationContext): string {
    const severity = finding.severity.toLowerCase();
    const findingType = context.findingType.toLowerCase();

    if (severity === 'critical') {
      if (findingType.includes('injection') || findingType.includes('rce')) {
        return "Critical business risk: Potential for complete system compromise, data breach, or service disruption. Immediate action required to prevent significant financial and reputational damage.";
      }
      return "High business risk: Potential for significant security breach affecting customer data, compliance, or business operations.";
    } else if (severity === 'high') {
      return "Moderate to high business risk: Security vulnerability that could lead to unauthorized access or data exposure if exploited.";
    } else if (severity === 'medium') {
      return "Moderate business risk: Security issue that should be addressed to maintain security posture and compliance requirements.";
    } else {
      return "Low business risk: Minor security consideration that should be monitored and addressed during regular maintenance.";
    }
  }

  private getTechnicalImpact(finding: any, context: RecommendationContext): string {
    const severity = finding.severity.toLowerCase();
    const tool = finding.tool.toLowerCase();

    if (severity === 'critical') {
      return "System compromise possible: Attackers could gain full control, access sensitive data, or disrupt services.";
    } else if (severity === 'high') {
      return "Significant security exposure: Potential for unauthorized access, privilege escalation, or data manipulation.";
    } else if (severity === 'medium') {
      return "Moderate security concern: Could be exploited to gain limited access or gather information for further attacks.";
    } else {
      return "Minor security consideration: Low likelihood of exploitation but should be addressed for best practices.";
    }
  }

  private getNextSteps(finding: any, context: RecommendationContext): string[] {
    const severity = finding.severity.toLowerCase();
    const findingType = context.findingType.toLowerCase();
    const tool = finding.tool.toLowerCase();

    const steps: string[] = [];

    // Immediate actions based on severity
    if (severity === 'critical') {
      steps.push("🚨 IMMEDIATE ACTION REQUIRED: Assess if this vulnerability is currently being exploited");
      steps.push("🔒 Implement temporary mitigation measures (e.g., disable affected functionality, add rate limiting)");
      steps.push("📞 Notify security team and stakeholders immediately");
    } else if (severity === 'high') {
      steps.push("⚡ HIGH PRIORITY: Schedule remediation within 24-48 hours");
      steps.push("🔍 Assess current exposure and potential for exploitation");
    }

    // Tool-specific next steps
    if (tool === 'zap') {
      steps.push("🔍 Review ZAP scan details and vulnerability references");
      steps.push("📋 Check for similar vulnerabilities across other web targets");
    } else if (tool === 'semgrep') {
      steps.push("💻 Review the specific code location and understand the security issue");
      steps.push("🔧 Implement secure coding practices to fix the vulnerability");
    } else if (tool === 'trivy') {
      steps.push("📦 Check if updated versions of affected dependencies are available");
      steps.push("🔄 Plan dependency updates during next maintenance window");
    } else if (tool === 'osv') {
      steps.push("📦 Check for updated versions of vulnerable dependencies");
      steps.push("🔄 Plan dependency updates and test compatibility");
    } else if (tool === 'github') {
      steps.push("📋 Review GitHub security advisories and Dependabot alerts");
      steps.push("🔄 Address repository-specific security recommendations");
    }

    // Finding type specific steps
    if (findingType.includes('cache') || findingType.includes('header')) {
      steps.push("⚙️ Configure appropriate cache-control headers for sensitive content");
      steps.push("📝 Update web server configuration (nginx, Apache, etc.)");
    } else if (findingType.includes('ssl') || findingType.includes('tls')) {
      steps.push("🔐 Update SSL/TLS configuration to use secure protocols and ciphers");
      steps.push("📅 Check certificate expiration dates");
    } else if (findingType.includes('authentication')) {
      steps.push("🔑 Review authentication mechanisms and implement proper session management");
      steps.push("🛡️ Consider implementing multi-factor authentication");
    }

    // General next steps
    steps.push("📊 Track remediation progress and verify fix effectiveness");
    steps.push("🔄 Schedule follow-up scan to confirm resolution");
    steps.push("📚 Document lessons learned and update security policies if needed");

    return steps;
  }

  private determineFindingType(title: string, tool: string, rawResult?: any): string {
    const titleLower = title.toLowerCase();
    const toolLower = tool.toLowerCase();
    
    // Tool-specific finding type determination
    if (toolLower === 'zap') {
      return this.determineZapFindingType(titleLower, rawResult);
    } else if (toolLower === 'semgrep') {
      return this.determineSemgrepFindingType(titleLower, rawResult);
    } else if (toolLower === 'trivy') {
      return this.determineTrivyFindingType(titleLower, rawResult);
    } else if (toolLower === 'osv') {
      return 'dependency_vulnerability';
    } else if (toolLower === 'github') {
      return 'repository_security';
    }
    
    // Generic finding type determination
    if (titleLower.includes('injection') || titleLower.includes('sql') || titleLower.includes('xss')) {
      return 'injection';
    } else if (titleLower.includes('ssl') || titleLower.includes('tls') || titleLower.includes('certificate')) {
      return 'ssl_tls';
    } else if (titleLower.includes('header') || titleLower.includes('cache')) {
      return 'http_headers';
    } else if (titleLower.includes('authentication') || titleLower.includes('auth')) {
      return 'authentication';
    } else if (titleLower.includes('directory') || titleLower.includes('path')) {
      return 'directory_traversal';
    } else if (titleLower.includes('cors') || titleLower.includes('cross-origin')) {
      return 'cors';
    } else {
      return 'general_security';
    }
  }

  private determineZapFindingType(titleLower: string, rawResult?: any): string {
    if (titleLower.includes('sql injection') || titleLower.includes('sqli')) {
      return 'sql_injection';
    } else if (titleLower.includes('cross site scripting') || titleLower.includes('xss')) {
      return 'xss';
    } else if (titleLower.includes('csrf') || titleLower.includes('cross site request forgery')) {
      return 'csrf';
    } else if (titleLower.includes('authentication') || titleLower.includes('session')) {
      return 'authentication';
    } else if (titleLower.includes('directory') || titleLower.includes('path traversal')) {
      return 'directory_traversal';
    } else if (titleLower.includes('ssl') || titleLower.includes('tls')) {
      return 'ssl_tls';
    } else {
      return 'web_vulnerability';
    }
  }

  private determineSemgrepFindingType(titleLower: string, rawResult?: any): string {
    if (titleLower.includes('hardcoded') || titleLower.includes('secret')) {
      return 'hardcoded_secrets';
    } else if (titleLower.includes('injection') || titleLower.includes('sql')) {
      return 'code_injection';
    } else if (titleLower.includes('xss') || titleLower.includes('cross site')) {
      return 'xss_vulnerability';
    } else if (titleLower.includes('authentication') || titleLower.includes('auth')) {
      return 'authentication_flaw';
    } else if (titleLower.includes('crypto') || titleLower.includes('encryption')) {
      return 'cryptographic_issue';
    } else {
      return 'code_security_issue';
    }
  }

  private determineTrivyFindingType(titleLower: string, rawResult?: any): string {
    if (titleLower.includes('vulnerability') || titleLower.includes('cve')) {
      return 'container_vulnerability';
    } else if (titleLower.includes('misconfiguration') || titleLower.includes('config')) {
      return 'container_misconfiguration';
    } else if (titleLower.includes('secret') || titleLower.includes('password')) {
      return 'container_secrets';
    } else {
      return 'container_security';
    }
  }

  private generateActionPlan(finding: any, context: RecommendationContext): ActionStep[] {
    const severity = finding.severity.toLowerCase();
    const findingType = context.findingType.toLowerCase();
    const tool = finding.tool.toLowerCase();

    const actionPlan: ActionStep[] = [];

    // Immediate assessment step for critical/high findings
    if (severity === 'critical' || severity === 'high') {
      actionPlan.push({
        id: 'assess-immediate-risk',
        title: 'Assess Immediate Risk',
        description: 'Evaluate if the vulnerability is currently being exploited and assess immediate business impact',
        priority: FindingPriority.P0,
        estimatedTime: '15-30 minutes',
        requiredSkills: ['Security Analysis', 'Risk Assessment'],
        resources: ['Security team contact', 'Incident response procedures'],
        completed: false
      });
    }

    // Investigation step
    actionPlan.push({
      id: 'investigate-finding',
      title: 'Investigate Finding Details',
      description: `Review the ${tool} scan results and understand the technical details of the ${findingType} vulnerability`,
      priority: severity === 'critical' ? FindingPriority.P0 : FindingPriority.P1,
      estimatedTime: '30-60 minutes',
      requiredSkills: ['Security Analysis', 'Technical Investigation'],
      resources: [`${tool} documentation`, 'Vulnerability database', 'Technical team'],
      completed: false
    });

    // Remediation planning
    actionPlan.push({
      id: 'plan-remediation',
      title: 'Plan Remediation Approach',
      description: 'Develop a detailed plan for fixing the vulnerability, including testing and rollback procedures',
      priority: severity === 'critical' ? FindingPriority.P0 : FindingPriority.P1,
      estimatedTime: '1-2 hours',
      requiredSkills: ['Security Engineering', 'System Administration'],
      resources: ['Security best practices', 'System documentation', 'Change management process'],
      dependencies: ['investigate-finding'],
      completed: false
    });

    // Implementation step
    const implementationStep: ActionStep = {
      id: 'implement-fix',
      title: 'Implement Security Fix',
      description: 'Apply the security fix according to the remediation plan',
      priority: severity === 'critical' ? FindingPriority.P0 : FindingPriority.P1,
      estimatedTime: this.getImplementationTime(findingType, tool),
      requiredSkills: this.getRequiredSkills(findingType, tool),
      resources: this.getImplementationResources(findingType, tool),
      dependencies: ['plan-remediation'],
      completed: false
    };
    actionPlan.push(implementationStep);

    // Testing and validation
    actionPlan.push({
      id: 'test-fix',
      title: 'Test and Validate Fix',
      description: 'Verify that the security fix works correctly and does not break existing functionality',
      priority: FindingPriority.P1,
      estimatedTime: '1-3 hours',
      requiredSkills: ['Testing', 'Security Validation'],
      resources: ['Test environment', 'Security testing tools', 'QA team'],
      dependencies: ['implement-fix'],
      completed: false
    });

    // Monitoring step
    actionPlan.push({
      id: 'monitor-resolution',
      title: 'Monitor Resolution',
      description: 'Schedule follow-up scans and monitor for any regression or related issues',
      priority: FindingPriority.P2,
      estimatedTime: 'Ongoing',
      requiredSkills: ['Monitoring', 'Security Operations'],
      resources: ['Monitoring tools', 'Scan scheduling', 'Alert systems'],
      dependencies: ['test-fix'],
      completed: false
    });

    return actionPlan;
  }

  private getImplementationTime(findingType: string, tool: string): string {
    if (findingType.includes('configuration') || findingType.includes('header')) {
      return '30 minutes - 2 hours';
    } else if (findingType.includes('dependency') || findingType.includes('library')) {
      return '2-8 hours';
    } else if (findingType.includes('code') || findingType.includes('logic')) {
      return '1-3 days';
    } else {
      return '1-4 hours';
    }
  }

  private getRequiredSkills(findingType: string, tool: string): string[] {
    const skills = ['Security Engineering'];
    
    if (findingType.includes('web') || findingType.includes('http')) {
      skills.push('Web Development', 'HTTP/HTTPS');
    }
    if (findingType.includes('code') || findingType.includes('application')) {
      skills.push('Software Development', 'Code Review');
    }
    if (findingType.includes('infrastructure') || findingType.includes('server')) {
      skills.push('System Administration', 'DevOps');
    }
    if (tool === 'semgrep') {
      skills.push('Static Analysis', 'Code Security');
    }
    if (tool === 'trivy') {
      skills.push('Container Security', 'Dependency Management');
    }
    
    return skills;
  }

  private getImplementationResources(findingType: string, tool: string): string[] {
    const resources = ['Security documentation', 'Technical team'];
    
    if (findingType.includes('web') || findingType.includes('http')) {
      resources.push('Web server configuration', 'CDN settings');
    }
    if (findingType.includes('code') || findingType.includes('application')) {
      resources.push('Development environment', 'Code repository', 'CI/CD pipeline');
    }
    if (findingType.includes('dependency') || findingType.includes('library')) {
      resources.push('Package manager', 'Dependency update procedures');
    }
    if (tool === 'semgrep') {
      resources.push('Semgrep rules documentation', 'Secure coding guidelines');
    }
    if (tool === 'trivy') {
      resources.push('Container registry', 'Deployment procedures');
    }
    
    return resources;
  }

  /**
   * Generate executive summary for reports
   */
  generateExecutiveSummary(findings: any[]): {
    criticalIssues: string[];
    recommendedActions: string[];
    riskAssessment: string;
    complianceImpact: string;
  } {
    const criticalFindings = findings.filter(f => f.severity === 'critical');
    const highFindings = findings.filter(f => f.severity === 'high');
    
    const criticalIssues: string[] = [];
    const recommendedActions: string[] = [];
    
    if (criticalFindings.length > 0) {
      criticalIssues.push(`${criticalFindings.length} critical vulnerabilities require immediate attention`);
      recommendedActions.push("Implement emergency response procedures for critical findings");
    }
    
    if (highFindings.length > 0) {
      criticalIssues.push(`${highFindings.length} high-severity issues should be addressed within 24-48 hours`);
      recommendedActions.push("Prioritize high-severity findings in next sprint or maintenance window");
    }
    
    const riskAssessment = this.generateRiskAssessment(findings);
    const complianceImpact = this.generateComplianceImpact(findings);
    
    return {
      criticalIssues,
      recommendedActions,
      riskAssessment,
      complianceImpact
    };
  }

  private generateRiskAssessment(findings: any[]): string {
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    const totalCount = findings.length;
    
    if (criticalCount > 0) {
      return `HIGH RISK: ${criticalCount} critical vulnerabilities present immediate security risks that could lead to system compromise, data breach, or service disruption. Immediate remediation required.`;
    } else if (highCount > 3) {
      return `ELEVATED RISK: ${highCount} high-severity vulnerabilities create significant security exposure. Prioritized remediation recommended within 48 hours.`;
    } else if (highCount > 0) {
      return `MODERATE RISK: ${highCount} high-severity vulnerabilities should be addressed promptly to maintain security posture.`;
    } else {
      return `LOW RISK: Security findings are primarily informational or low-severity. Regular maintenance schedule appropriate.`;
    }
  }

  private generateComplianceImpact(findings: any[]): string {
    const owaspFindings = findings.filter(f => f.owaspTop10Tags && f.owaspTop10Tags.length > 0);
    const criticalCompliance = findings.filter(f => f.severity === 'critical' && f.owaspTop10Tags && f.owaspTop10Tags.length > 0);
    
    if (criticalCompliance.length > 0) {
      return `COMPLIANCE CONCERN: ${criticalCompliance.length} critical OWASP Top 10 violations require immediate attention to maintain compliance with security standards.`;
    } else if (owaspFindings.length > 0) {
      return `COMPLIANCE MONITORING: ${owaspFindings.length} OWASP Top 10 related findings should be addressed to maintain security compliance posture.`;
    } else {
      return `COMPLIANCE STATUS: No major compliance violations detected. Continue regular security monitoring.`;
    }
  }
}
