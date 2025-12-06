#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { executeSubfinder } from "./tools/subfinder.js";
import { executeDnsx } from "./tools/dnsx.js";
import { executeNaabu } from "./tools/naabu.js";
import { executeHttpx } from "./tools/httpx.js";
import { executeKatana } from "./tools/katana.js";
import { executeNuclei } from "./tools/nuclei.js";
import { runBugBountyWorkflow } from "./workflows/bug-bounty.js";

// Create MCP server instance
const server = new Server(
  {
    name: "projectdiscovery-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "subfinder",
        description: "Discover subdomains for a given domain using passive sources",
        inputSchema: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              description: "Target domain (e.g., example.com)",
            },
            silent: {
              type: "boolean",
              description: "Show only subdomains in output",
            },
          },
          required: ["domain"],
        },
      },
      {
        name: "dnsx",
        description: "Resolve DNS records for domains and subdomains",
        inputSchema: {
          type: "object",
          properties: {
            domains: {
              type: "array",
              items: { type: "string" },
              description: "List of domains to resolve",
            },
            recordType: {
              type: "string",
              description: "DNS record type (A, AAAA, CNAME, etc.)",
            },
          },
          required: ["domains"],
        },
      },
      {
        name: "naabu",
        description: "Fast port scanner to discover open ports on hosts",
        inputSchema: {
          type: "object",
          properties: {
            hosts: {
              type: "array",
              items: { type: "string" },
              description: "List of hosts to scan",
            },
            ports: {
              type: "string",
              description: "Ports to scan (e.g., '80,443' or '1-1000')",
            },
            topPorts: {
              type: "number",
              description: "Scan top N ports",
            },
          },
          required: ["hosts"],
        },
      },
      {
        name: "httpx",
        description: "Probe HTTP/HTTPS servers and gather information",
        inputSchema: {
          type: "object",
          properties: {
            urls: {
              type: "array",
              items: { type: "string" },
              description: "List of URLs or hosts to probe",
            },
            followRedirects: {
              type: "boolean",
              description: "Follow HTTP redirects",
            },
            screenshot: {
              type: "boolean",
              description: "Take screenshots",
            },
          },
          required: ["urls"],
        },
      },
      {
        name: "katana",
        description: "Fast web crawler for discovering endpoints and paths",
        inputSchema: {
          type: "object",
          properties: {
            urls: {
              type: "array",
              items: { type: "string" },
              description: "List of URLs to crawl",
            },
            depth: {
              type: "number",
              description: "Crawl depth (default: 2)",
            },
            scope: {
              type: "string",
              description: "Crawl scope (e.g., regex pattern)",
            },
          },
          required: ["urls"],
        },
      },
      {
        name: "nuclei",
        description: "Fast vulnerability scanner using YAML-based templates",
        inputSchema: {
          type: "object",
          properties: {
            targets: {
              type: "array",
              items: { type: "string" },
              description: "List of targets to scan",
            },
            templates: {
              type: "array",
              items: { type: "string" },
              description: "Specific templates to use",
            },
            severity: {
              type: "array",
              items: { type: "string" },
              description:
                "Filter by severity (critical, high, medium, low, info)",
            },
          },
          required: ["targets"],
        },
      },
      {
        name: "bug_bounty_workflow",
        description:
          "Execute complete bug bounty reconnaissance workflow: subdomain discovery, DNS resolution, port scanning, HTTP probing, crawling, and vulnerability scanning",
        inputSchema: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              description: "Target domain for bug bounty reconnaissance",
            },
            portScan: {
              type: "boolean",
              description: "Include port scanning (default: true)",
            },
            crawl: {
              type: "boolean",
              description: "Include web crawling (default: true)",
            },
            vulnerabilityScan: {
              type: "boolean",
              description: "Include vulnerability scanning (default: true)",
            },
            severityFilter: {
              type: "array",
              items: { type: "string" },
              description:
                "Nuclei severity filter (critical, high, medium, low)",
            },
            maxCrawlUrls: {
              type: "number",
              description: "Maximum URLs to crawl (default: 10)",
            },
            maxScanUrls: {
              type: "number",
              description: "Maximum URLs to scan with Nuclei (default: 20)",
            },
            maxTopPorts: {
              type: "number",
              description: "Maximum top ports for Naabu (default: 100)",
            },
            batchSize: {
              type: "number",
              description: "Batch size for DNS/HTTP requests (default: 50)",
            },
            delayBetweenBatches: {
              type: "number",
              description: "Delay in milliseconds between batches (default: 1000)",
            },
            crawlDepth: {
              type: "number",
              description: "Crawl depth for Katana (default: 2)",
            },
          },
          required: ["domain"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "subfinder": {
        const { domain, silent } = args as { domain: string; silent?: boolean };
        const result = await executeSubfinder(domain, silent);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "dnsx": {
        const { domains, recordType } = args as {
          domains: string[];
          recordType?: string;
        };
        const result = await executeDnsx(domains, recordType);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "naabu": {
        const { hosts, ports, topPorts } = args as {
          hosts: string[];
          ports?: string;
          topPorts?: number;
        };
        const result = await executeNaabu(hosts, ports, topPorts);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "httpx": {
        const { urls, followRedirects, screenshot } = args as {
          urls: string[];
          followRedirects?: boolean;
          screenshot?: boolean;
        };
        const result = await executeHttpx(urls, followRedirects, screenshot);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "katana": {
        const { urls, depth, scope } = args as {
          urls: string[];
          depth?: number;
          scope?: string;
        };
        const result = await executeKatana(urls, depth, scope);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "nuclei": {
        const { targets, templates, severity } = args as {
          targets: string[];
          templates?: string[];
          severity?: string[];
        };
        const result = await executeNuclei(targets, templates, severity);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "bug_bounty_workflow": {
        const {
          domain,
          portScan,
          crawl,
          vulnerabilityScan,
          severityFilter,
          maxCrawlUrls,
          maxScanUrls,
          maxTopPorts,
          batchSize,
          delayBetweenBatches,
          crawlDepth,
        } = args as {
          domain: string;
          portScan?: boolean;
          crawl?: boolean;
          vulnerabilityScan?: boolean;
          severityFilter?: string[];
          maxCrawlUrls?: number;
          maxScanUrls?: number;
          maxTopPorts?: number;
          batchSize?: number;
          delayBetweenBatches?: number;
          crawlDepth?: number;
        };
        const result = await runBugBountyWorkflow(domain, {
          portScan: portScan ?? true,
          crawl: crawl ?? true,
          vulnerabilityScan: vulnerabilityScan ?? true,
          severityFilter,
          rateLimit: {
            maxCrawlUrls,
            maxScanUrls,
            maxTopPorts,
            batchSize,
            delayBetweenBatches,
            crawlDepth,
          },
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ProjectDiscovery MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
