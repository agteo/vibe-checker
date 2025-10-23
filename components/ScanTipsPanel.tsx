import React, { useState, useEffect } from 'react';

interface ScanTipsPanelProps {
  scanPhase?: 'spider' | 'active' | 'completed';
  className?: string;
}

interface TipContent {
  title: string;
  description: string;
  quickTip: string;
  phase: string;
}

const tipContent: Record<string, TipContent> = {
  spider: {
    title: "🕷️ Discovering URLs",
    description: "ZAP is crawling your app to find all pages and endpoints.",
    quickTip: "This usually takes 1-3 minutes and finds hidden pages.",
    phase: "spider"
  },
  active: {
    title: "🔍 Testing for Vulnerabilities", 
    description: "ZAP is testing each page for security issues like SQL injection and XSS.",
    quickTip: "Testing 100+ security rules - this is the thorough part!",
    phase: "active"
  },
  completed: {
    title: "✅ Scan Complete",
    description: "Your security scan is finished! Check the findings below.",
    quickTip: "Start with Critical and High severity issues first.",
    phase: "completed"
  }
};

const quickTips = [
  "💡 ZAP tests for OWASP Top 10 vulnerabilities",
  "💡 False positives happen - verify findings before fixing", 
  "💡 Regular scans help track security improvements",
  "💡 Rate limiting prevents overwhelming your app",
  "💡 Deeper scans find more issues but take longer",
  "💡 Start with Critical findings, then High severity",
  "💡 Security headers like CSP help prevent XSS",
  "💡 Keep dependencies updated to avoid known vulnerabilities"
];

const vulnerabilityExplanations = {
  "SQL Injection": "Malicious SQL code injected into inputs",
  "XSS": "Malicious scripts injected into web pages", 
  "CSRF": "Unauthorized actions performed on behalf of users",
  "Authentication Bypass": "Security mechanisms that can be broken"
};

export const ScanTipsPanel: React.FC<ScanTipsPanelProps> = ({ 
  scanPhase = 'active', 
  className = '' 
}) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showVulnDetails, setShowVulnDetails] = useState<string | null>(null);

  const content = tipContent[scanPhase] || tipContent.active;

  // Rotate through tips every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % quickTips.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-600/30 rounded-lg p-4 ${className}`}>
      {/* Current Phase Info */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-blue-200 mb-2">{content.title}</h3>
        <p className="text-blue-100 text-sm mb-2">{content.description}</p>
        <div className="bg-blue-800/30 border border-blue-500/30 rounded p-2">
          <p className="text-blue-200 text-sm font-medium">{content.quickTip}</p>
        </div>
      </div>

      {/* Rotating Tips */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-blue-200 mb-2">💡 Security Tips</h4>
        <div className="bg-blue-800/20 border border-blue-500/30 rounded p-3">
          <p className="text-blue-100 text-sm">{quickTips[currentTipIndex]}</p>
        </div>
        
        {/* Tip Navigation */}
        <div className="flex justify-center mt-2 space-x-1">
          {quickTips.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTipIndex(index)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                index === currentTipIndex ? 'bg-blue-400' : 'bg-blue-600/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Vulnerability Types (only for active phase) */}
      {scanPhase === 'active' && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-blue-200 mb-2">🔒 Testing For</h4>
          <div className="flex flex-wrap gap-1">
            {Object.keys(vulnerabilityExplanations).map((vuln) => (
              <button
                key={vuln}
                onClick={() => setShowVulnDetails(
                  showVulnDetails === vuln ? null : vuln
                )}
                className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs rounded border border-blue-500/30 transition-colors"
              >
                {vuln}
              </button>
            ))}
          </div>
          
          {/* Vulnerability Details */}
          {showVulnDetails && vulnerabilityExplanations[showVulnDetails] && (
            <div className="mt-2 p-2 bg-blue-800/30 border border-blue-500/30 rounded text-xs">
              <p className="text-blue-200 font-medium">{showVulnDetails}</p>
              <p className="text-blue-100">{vulnerabilityExplanations[showVulnDetails]}</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Quiz (only for active phase) */}
      {scanPhase === 'active' && (
        <div className="border-t border-blue-600/30 pt-3">
          <h4 className="text-sm font-semibold text-blue-200 mb-2">🧠 Quick Question</h4>
          <div className="bg-blue-800/20 border border-blue-500/30 rounded p-2">
            <p className="text-blue-100 text-xs mb-2">
              <strong>Q:</strong> What does CSP (Content Security Policy) help prevent?
            </p>
            <div className="text-xs text-green-200 bg-green-800/30 border border-green-500/30 rounded p-1">
              <strong>A:</strong> Cross-Site Scripting (XSS) attacks
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
