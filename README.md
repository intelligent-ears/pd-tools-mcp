# ProjectDiscovery MCP Server

A Model Context Protocol (MCP) server that integrates [ProjectDiscovery](https://projectdiscovery.io) security tools for automated bug bounty reconnaissance and vulnerability scanning.

## Features

This MCP server provides comprehensive security reconnaissance capabilities:

### Individual Tools
- **subfinder** - Subdomain discovery using passive sources
- **dnsx** - DNS resolution and probing
- **naabu** - Fast port scanning
- **httpx** - HTTP/HTTPS probing and analysis
- **katana** - Web crawling and endpoint discovery
- **nuclei** - Vulnerability scanning with YAML templates

### Automated Workflow
- **bug_bounty_workflow** - End-to-end reconnaissance pipeline that chains all tools together

## Workflow Diagram

```
                    Target Domain
                          │
                          ▼
        ┌─────────────────────────────────────────────┐
        │  Step 1: Subdomain Discovery (subfinder)    │
        │  Find all subdomains via passive sources    │
        └──────────────────┬──────────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────────────┐
        │  Step 2: DNS Resolution (dnsx)              │
        │  Resolve domains to IP addresses            │
        └──────────────────┬──────────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────────────┐
        │  Step 3: Port Scanning (naabu) [OPTIONAL]   │
        │  Scan top ports on resolved hosts           │
        └──────────────────┬──────────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────────────┐
        │  Step 4: HTTP Probing (httpx)               │
        │  Identify live web services                 │
        └──────────────────┬──────────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────────────┐
        │  Step 5: Web Crawling (katana) [OPTIONAL]   │
        │  Discover endpoints & paths                 │
        └──────────────────┬──────────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────────────┐
        │  Step 6: Vulnerability Scan (nuclei)        │
        │  Test for known vulnerabilities             │
        └──────────────────┬──────────────────────────┘
                           │
                           ▼
                  Comprehensive Report
                  ├─ Attack surface mapping
                  ├─ Open ports & services
                  ├─ Live web applications
                  ├─ Discovered endpoints
                  └─ Security vulnerabilities
```

**Execution Time:** ~2 minutes (varies by target size)

**Output:** JSON report with:
- Total subdomains, resolved hosts, open ports
- Live HTTP services with status codes and titles
- Crawled endpoints and paths
- Vulnerabilities categorized by severity (critical/high/medium/low)

## Prerequisites

Before using this MCP server, you must install the ProjectDiscovery tools:

```bash
# Install Go (required)
# On Ubuntu/Debian
sudo apt update
sudo apt install golang-go

# On macOS
brew install go

# Install ProjectDiscovery tools
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install -v github.com/projectdiscovery/dnsx/cmd/dnsx@latest
go install -v github.com/projectdiscovery/naabu/v2/cmd/naabu@latest
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
go install -v github.com/projectdiscovery/katana/cmd/katana@latest
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Update Nuclei templates
nuclei -update-templates

# Ensure tools are in PATH
export PATH=$PATH:$(go env GOPATH)/bin
```

## Installation

```bash
# Clone the repository
git clone https://github.com/intelligent-ears/pd-tools-mcp
cd pd-tools-mcp

# Install dependencies
npm install

# Build the server
npm run build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "projectdiscovery": {
      "command": "node",
      "args": ["/absolute/path/to/pdmcp/build/index.js"]
    }
  }
}
```

### With VS Code

Create or update `.vscode/mcp.json` in your workspace:

```json
{
  "projectdiscovery": {
    "type": "stdio",
    "command": "node",
    "args": ["/absolute/path/to/pdmcp/build/index.js"]
  }
}
```

### Standalone Testing

```bash
npm start
```

## Available Tools

### 1. subfinder
Discover subdomains for a target domain.

**Input:**
- `domain` (string, required): Target domain (e.g., "example.com")
- `silent` (boolean, optional): Show only subdomains in output

**Example:**
```json
{
  "domain": "example.com",
  "silent": true
}
```

### 2. dnsx
Resolve DNS records for domains.

**Input:**
- `domains` (array of strings, required): List of domains to resolve
- `recordType` (string, optional): DNS record type (A, AAAA, CNAME, etc.)

**Example:**
```json
{
  "domains": ["example.com", "sub.example.com"],
  "recordType": "A"
}
```

### 3. naabu
Scan for open ports on hosts.

**Input:**
- `hosts` (array of strings, required): List of hosts to scan
- `ports` (string, optional): Ports to scan (e.g., "80,443" or "1-1000")
- `topPorts` (number, optional): Scan top N ports

**Example:**
```json
{
  "hosts": ["example.com"],
  "topPorts": 100
}
```

### 4. httpx
Probe HTTP/HTTPS servers.

**Input:**
- `urls` (array of strings, required): List of URLs or hosts
- `followRedirects` (boolean, optional): Follow HTTP redirects
- `screenshot` (boolean, optional): Take screenshots

**Example:**
```json
{
  "urls": ["https://example.com"],
  "followRedirects": true
}
```

### 5. katana
Crawl websites and discover endpoints.

**Input:**
- `urls` (array of strings, required): List of URLs to crawl
- `depth` (number, optional): Crawl depth (default: 2)
- `scope` (string, optional): Crawl scope regex pattern

**Example:**
```json
{
  "urls": ["https://example.com"],
  "depth": 3
}
```

### 6. nuclei
Scan for vulnerabilities using templates.

**Input:**
- `targets` (array of strings, required): List of targets
- `templates` (array of strings, optional): Specific templates to use
- `severity` (array of strings, optional): Filter by severity (critical, high, medium, low, info)

**Example:**
```json
{
  "targets": ["https://example.com"],
  "severity": ["critical", "high"]
}
```

### 7. Bug hunting workflow
Execute complete automated reconnaissance workflow.

**Input:**
- `domain` (string, required): Target domain
- `portScan` (boolean, optional): Include port scanning (default: true)
- `crawl` (boolean, optional): Include web crawling (default: true)
- `vulnerabilityScan` (boolean, optional): Include vulnerability scanning (default: true)
- `severityFilter` (array of strings, optional): Nuclei severity filter

**Example:**
```json
{
  "domain": "example.com",
  "portScan": true,
  "crawl": true,
  "vulnerabilityScan": true,
  "severityFilter": ["critical", "high"]
}
```

**Workflow Steps:**
1. **Subdomain Discovery** - Find all subdomains
2. **DNS Resolution** - Resolve subdomains to IPs
3. **Port Scanning** - Identify open ports (optional)
4. **HTTP Probing** - Find live web services
5. **Web Crawling** - Discover endpoints (optional)
6. **Vulnerability Scanning** - Detect security issues (optional)

## Example Usage

Once configured with an MCP client like Claude Desktop, you can use natural language:

> "Use the bug_bounty_workflow tool to scan example.com for vulnerabilities"

> "Find all subdomains for hackerone.com using subfinder"

> "Scan the top 100 ports on example.com with naabu"

> "Crawl https://example.com and find all endpoints with katana"


## Development

```bash
# Watch mode for development
npm run dev

# Build
npm run build

# Run
npm start
```

## Credits

Built with:
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [ProjectDiscovery Tools](https://github.com/projectdiscovery)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
