import { spawn } from "child_process";

export interface SubfinderResult {
  subdomains: string[];
  count: number;
  error?: string;
}

export async function executeSubfinder(
  domain: string,
  silent: boolean = true
): Promise<SubfinderResult> {
  return new Promise((resolve) => {
    const args = ["-d", domain, "-json"];
    if (silent) args.push("-silent");

    const subdomains: string[] = [];
    let errorOutput = "";

    const process = spawn("subfinder", args);

    process.stdout.on("data", (data) => {
      const lines = data.toString().split("\n").filter((line: string) => line.trim());
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.host) {
            subdomains.push(parsed.host);
          }
        } catch (e) {
          // If not JSON, treat as plain subdomain
          if (line.trim()) subdomains.push(line.trim());
        }
      }
    });

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      if (code !== 0 && subdomains.length === 0) {
        resolve({
          subdomains: [],
          count: 0,
          error: `subfinder exited with code ${code}: ${errorOutput}`,
        });
      } else {
        resolve({
          subdomains: [...new Set(subdomains)], // Remove duplicates
          count: subdomains.length,
        });
      }
    });

    process.on("error", (err) => {
      resolve({
        subdomains: [],
        count: 0,
        error: `Failed to execute subfinder: ${err.message}. Make sure subfinder is installed.`,
      });
    });
  });
}
