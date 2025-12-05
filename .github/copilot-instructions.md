# ProjectDiscovery MCP Server

This is a Model Context Protocol (MCP) server that integrates ProjectDiscovery security tools for automated bug bounty reconnaissance and vulnerability scanning.

## Project Type
MCP Server - TypeScript

## Tools Integrated
- subfinder - Subdomain discovery
- dnsx - DNS resolution
- naabu - Port scanning
- httpx - HTTP probing
- katana - Web crawling
- nuclei - Vulnerability scanning

## Development Guidelines
- Use TypeScript for type safety
- Follow MCP SDK patterns
- Execute ProjectDiscovery tools via child processes
- Parse JSON output from tools
- Provide clear error handling
