import { spawn } from "child_process";

export interface DnsxResult {
  resolved: Array<{ domain: string; ip: string; type?: string }>;
  count: number;
  error?: string;
}

export async function executeDnsx(
  domains: string[],
  recordType?: string
): Promise<DnsxResult> {
  return new Promise((resolve) => {
    const args = ["-json"];
    if (recordType) args.push("-a", recordType);

    const resolved: Array<{ domain: string; ip: string; type?: string }> = [];
    let errorOutput = "";

    const process = spawn("dnsx", args);

    // Feed domains via stdin
    process.stdin.write(domains.join("\n") + "\n");
    process.stdin.end();

    process.stdout.on("data", (data) => {
      const lines = data.toString().split("\n").filter((line: string) => line.trim());
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.host && parsed.a) {
            for (const ip of parsed.a) {
              resolved.push({
                domain: parsed.host,
                ip: ip,
                type: "A",
              });
            }
          }
        } catch (e) {
          // Skip unparseable lines
        }
      }
    });

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      if (code !== 0 && resolved.length === 0) {
        resolve({
          resolved: [],
          count: 0,
          error: `dnsx exited with code ${code}: ${errorOutput}`,
        });
      } else {
        resolve({
          resolved,
          count: resolved.length,
        });
      }
    });

    process.on("error", (err) => {
      resolve({
        resolved: [],
        count: 0,
        error: `Failed to execute dnsx: ${err.message}. Make sure dnsx is installed.`,
      });
    });
  });
}
