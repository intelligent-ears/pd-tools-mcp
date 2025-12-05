import { spawn } from "child_process";

export interface KatanaResult {
  endpoints: string[];
  count: number;
  error?: string;
}

export async function executeKatana(
  urls: string[],
  depth: number = 2,
  scope?: string
): Promise<KatanaResult> {
  return new Promise((resolve) => {
    const args = ["-d", depth.toString(), "-jsonl"];
    if (scope) args.push("-f", scope);

    const endpoints: string[] = [];
    let errorOutput = "";

    const process = spawn("katana", args);

    // Feed URLs via stdin
    process.stdin.write(urls.join("\n") + "\n");
    process.stdin.end();

    process.stdout.on("data", (data) => {
      const lines = data.toString().split("\n").filter((line: string) => line.trim());
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.request && parsed.request.endpoint) {
            endpoints.push(parsed.request.endpoint);
          }
        } catch (e) {
          // If not JSON, treat as plain endpoint
          if (line.trim() && line.startsWith("http")) {
            endpoints.push(line.trim());
          }
        }
      }
    });

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      if (code !== 0 && endpoints.length === 0) {
        resolve({
          endpoints: [],
          count: 0,
          error: `katana exited with code ${code}: ${errorOutput}`,
        });
      } else {
        resolve({
          endpoints: [...new Set(endpoints)], // Remove duplicates
          count: endpoints.length,
        });
      }
    });

    process.on("error", (err) => {
      resolve({
        endpoints: [],
        count: 0,
        error: `Failed to execute katana: ${err.message}. Make sure katana is installed.`,
      });
    });
  });
}
