import { executeSubfinder } from "../tools/subfinder.js";
import { executeDnsx } from "../tools/dnsx.js";
import { executeNaabu } from "../tools/naabu.js";
import { executeHttpx } from "../tools/httpx.js";
import { executeKatana } from "../tools/katana.js";
import { executeNuclei } from "../tools/nuclei.js";

export interface BugBountyWorkflowOptions {
  portScan: boolean;
  crawl: boolean;
  vulnerabilityScan: boolean;
  severityFilter?: string[];
}

export interface BugBountyWorkflowResult {
  summary: {
    domain: string;
    totalSubdomains: number;
    totalResolvedHosts: number;
    totalOpenPorts: number;
    totalLiveHosts: number;
    totalEndpoints: number;
    totalVulnerabilities: number;
    criticalFindings: number;
    highFindings: number;
    executionTime: number;
  };
  steps: {
    subdomainDiscovery?: any;
    dnsResolution?: any;
    portScanning?: any;
    httpProbing?: any;
    webCrawling?: any;
    vulnerabilityScanning?: any;
  };
  findings: any[];
}

export async function runBugBountyWorkflow(
  domain: string,
  options: BugBountyWorkflowOptions
): Promise<BugBountyWorkflowResult> {
  const startTime = Date.now();
  const result: BugBountyWorkflowResult = {
    summary: {
      domain,
      totalSubdomains: 0,
      totalResolvedHosts: 0,
      totalOpenPorts: 0,
      totalLiveHosts: 0,
      totalEndpoints: 0,
      totalVulnerabilities: 0,
      criticalFindings: 0,
      highFindings: 0,
      executionTime: 0,
    },
    steps: {},
    findings: [],
  };

  try {
    // Step 1: Subdomain Discovery
    console.error("🔍 Step 1: Discovering subdomains...");
    const subfinderResult = await executeSubfinder(domain, true);
    result.steps.subdomainDiscovery = subfinderResult;
    result.summary.totalSubdomains = subfinderResult.count;

    if (subfinderResult.error || subfinderResult.subdomains.length === 0) {
      console.error("❌ No subdomains found or error occurred");
      return result;
    }

    // Step 2: DNS Resolution
    console.error(`🌐 Step 2: Resolving ${subfinderResult.subdomains.length} domains...`);
    const dnsxResult = await executeDnsx(subfinderResult.subdomains);
    result.steps.dnsResolution = dnsxResult;
    result.summary.totalResolvedHosts = dnsxResult.count;

    if (dnsxResult.error || dnsxResult.resolved.length === 0) {
      console.error("❌ No domains resolved");
      return result;
    }

    const resolvedDomains = dnsxResult.resolved.map((r) => r.domain);

    // Step 3: Port Scanning (optional)
    if (options.portScan) {
      console.error(`🔎 Step 3: Scanning ports on ${resolvedDomains.length} hosts...`);
      const naabuResult = await executeNaabu(resolvedDomains, undefined, 100);
      result.steps.portScanning = naabuResult;
      result.summary.totalOpenPorts = naabuResult.count;
    }

    // Step 4: HTTP Probing
    console.error(`🌍 Step 4: Probing HTTP services...`);
    const httpxResult = await executeHttpx(resolvedDomains, true, false);
    result.steps.httpProbing = httpxResult;
    result.summary.totalLiveHosts = httpxResult.count;

    if (httpxResult.error || httpxResult.responses.length === 0) {
      console.error("❌ No live HTTP services found");
      return result;
    }

    const liveUrls = httpxResult.responses
      .filter((r) => r.statusCode && r.statusCode < 500)
      .map((r) => r.url);

    // Step 5: Web Crawling (optional)
    if (options.crawl && liveUrls.length > 0) {
      console.error(`🕷️  Step 5: Crawling ${liveUrls.length} URLs...`);
      const katanaResult = await executeKatana(liveUrls.slice(0, 10), 2); // Limit to 10 URLs
      result.steps.webCrawling = katanaResult;
      result.summary.totalEndpoints = katanaResult.count;
    }

    // Step 6: Vulnerability Scanning (optional)
    if (options.vulnerabilityScan && liveUrls.length > 0) {
      console.error(`🛡️  Step 6: Scanning for vulnerabilities...`);
      const nucleiResult = await executeNuclei(
        liveUrls.slice(0, 20), // Limit to 20 URLs for faster results
        undefined,
        options.severityFilter || ["critical", "high", "medium"]
      );
      result.steps.vulnerabilityScanning = nucleiResult;
      result.summary.totalVulnerabilities = nucleiResult.count;

      // Count critical and high findings
      result.summary.criticalFindings = nucleiResult.vulnerabilities.filter(
        (v) => v.info.severity.toLowerCase() === "critical"
      ).length;
      result.summary.highFindings = nucleiResult.vulnerabilities.filter(
        (v) => v.info.severity.toLowerCase() === "high"
      ).length;

      result.findings = nucleiResult.vulnerabilities;
    }

    // Calculate execution time
    result.summary.executionTime = Math.round((Date.now() - startTime) / 1000);

    console.error(`✅ Workflow completed in ${result.summary.executionTime}s`);
    return result;
  } catch (error) {
    console.error("❌ Workflow error:", error);
    result.summary.executionTime = Math.round((Date.now() - startTime) / 1000);
    return result;
  }
}
