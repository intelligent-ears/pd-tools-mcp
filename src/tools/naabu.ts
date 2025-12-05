import { spawn } from "child_process";

export interface NaabuResult {
  openPorts: Array<{ host: string; port: number }>;
  count: number;
  error?: string;
}

export async function executeNaabu(
  hosts: string[],
  ports?: string,
  topPorts?: number
): Promise<NaabuResult> {
  return new Promise((resolve) => {
    const args = ["-json"];
    
    if (ports) {
      args.push("-p", ports);
    } else if (topPorts) {
      args.push("-top-ports", topPorts.toString());
    } else {
      args.push("-top-ports", "100"); // Default to top 100 ports
    }

    const openPorts: Array<{ host: string; port: number }> = [];
    let errorOutput = "";

    const process = spawn("naabu", args);

    // Feed hosts via stdin
    process.stdin.write(hosts.join("\n") + "\n");
    process.stdin.end();

    process.stdout.on("data", (data) => {
      const lines = data.toString().split("\n").filter((line: string) => line.trim());
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.host && parsed.port) {
            openPorts.push({
              host: parsed.host,
              port: parsed.port,
            });
          }
        } catch (e) {
          // Try parsing format like "host:port"
          const match = line.match(/^(.+):(\d+)$/);
          if (match) {
            openPorts.push({
              host: match[1],
              port: parseInt(match[2]),
            });
          }
        }
      }
    });

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      if (code !== 0 && openPorts.length === 0) {
        resolve({
          openPorts: [],
          count: 0,
          error: `naabu exited with code ${code}: ${errorOutput}`,
        });
      } else {
        resolve({
          openPorts,
          count: openPorts.length,
        });
      }
    });

    process.on("error", (err) => {
      resolve({
        openPorts: [],
        count: 0,
        error: `Failed to execute naabu: ${err.message}. Make sure naabu is installed.`,
      });
    });
  });
}
