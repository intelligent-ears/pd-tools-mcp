import { executeSubfinder } from "../tools/subfinder.js";
import { executeDnsx } from "../tools/dnsx.js";
import { executeNaabu } from "../tools/naabu.js";
import { executeHttpx } from "../tools/httpx.js";
import { executeKatana } from "../tools/katana.js";
import { executeNuclei } from "../tools/nuclei.js";

export interface RateLimitOptions {
  maxCrawlUrls?: number;        // Max URLs to crawl (default: 10)
  maxScanUrls?: number;          // Max URLs to scan with Nuclei (default: 20)
  maxTopPorts?: number;          // Max top ports for Naabu (default: 100)
  batchSize?: number;            // Batch size for DNS/HTTP requests (default: 50)
  delayBetweenBatches?: number;  // Delay in ms between batches (default: 1000)
  crawlDepth?: number;           // Crawl depth for Katana (default: 2)
}

export interface BugBountyWorkflowOptions {
  portScan: boolean;
  crawl: boolean;
  vulnerabilityScan: boolean;
  severityFilter?: string[];
  rateLimit?: RateLimitOptions;
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

// Helper function to process items in batches with rate limiting
async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  delay: number,
  processFn: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.error(`  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${batch.length} items)...`);
    
    const batchResults = await processFn(batch);
    results.push(...batchResults);
    
    // Add delay between batches (except for the last batch)
    if (i + batchSize < items.length && delay > 0) {
      console.error(`  Rate limiting: waiting ${delay}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}

export async function runBugBountyWorkflow(
  domain: string,
  options: BugBountyWorkflowOptions
): Promise<BugBountyWorkflowResult> {
  const startTime = Date.now();
  
  // Apply rate limit defaults
  const rateLimit: Required<RateLimitOptions> = {
    maxCrawlUrls: options.rateLimit?.maxCrawlUrls ?? 10,
    maxScanUrls: options.rateLimit?.maxScanUrls ?? 20,
    maxTopPorts: options.rateLimit?.maxTopPorts ?? 100,
    batchSize: options.rateLimit?.batchSize ?? 50,
    delayBetweenBatches: options.rateLimit?.delayBetweenBatches ?? 1000,
    crawlDepth: options.rateLimit?.crawlDepth ?? 2,
  };
  
  console.error(`⚙️  Rate Limiting Config: maxCrawl=${rateLimit.maxCrawlUrls}, maxScan=${rateLimit.maxScanUrls}, batchSize=${rateLimit.batchSize}, delay=${rateLimit.delayBetweenBatches}ms`);
  
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
      console.error(`🔎 Step 3: Scanning ports on ${resolvedDomains.length} hosts (top ${rateLimit.maxTopPorts} ports)...`);
      const naabuResult = await executeNaabu(resolvedDomains, undefined, rateLimit.maxTopPorts);
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
      const urlsToCrawl = liveUrls.slice(0, rateLimit.maxCrawlUrls);
      console.error(`🕷️  Step 5: Crawling ${urlsToCrawl.length} URLs (depth ${rateLimit.crawlDepth})...`);
      const katanaResult = await executeKatana(urlsToCrawl, rateLimit.crawlDepth);
      result.steps.webCrawling = katanaResult;
      result.summary.totalEndpoints = katanaResult.count;
    }

    // Step 6: Vulnerability Scanning (optional)
    if (options.vulnerabilityScan && liveUrls.length > 0) {
      const urlsToScan = liveUrls.slice(0, rateLimit.maxScanUrls);
      console.error(`🛡️  Step 6: Scanning ${urlsToScan.length} URLs for vulnerabilities...`);
      const nucleiResult = await executeNuclei(
        urlsToScan,
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
