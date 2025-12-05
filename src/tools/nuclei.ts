import { spawn } from "child_process";

export interface NucleiVulnerability {
  template: string;
  templateID: string;
  info: {
    name: string;
    severity: string;
    description?: string;
  };
  matcherName?: string;
  type: string;
  host: string;
  matched?: string;
}

export interface NucleiResult {
  vulnerabilities: NucleiVulnerability[];
  count: number;
  error?: string;
}

export async function executeNuclei(
  targets: string[],
  templates?: string[],
  severity?: string[]
): Promise<NucleiResult> {
  return new Promise((resolve) => {
    const args = ["-json"];
    
    if (templates && templates.length > 0) {
      args.push("-t", templates.join(","));
    }
    
    if (severity && severity.length > 0) {
      args.push("-s", severity.join(","));
    }

    const vulnerabilities: NucleiVulnerability[] = [];
    let errorOutput = "";

    const process = spawn("nuclei", args);

    // Feed targets via stdin
    process.stdin.write(targets.join("\n") + "\n");
    process.stdin.end();

    process.stdout.on("data", (data) => {
      const lines = data.toString().split("\n").filter((line: string) => line.trim());
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.info && parsed.type) {
            vulnerabilities.push({
              template: parsed.template,
              templateID: parsed["template-id"] || parsed.templateID,
              info: {
                name: parsed.info.name,
                severity: parsed.info.severity,
                description: parsed.info.description,
              },
              matcherName: parsed["matcher-name"],
              type: parsed.type,
              host: parsed.host,
              matched: parsed.matched,
            });
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
      // Nuclei returns non-zero when findings are detected
      resolve({
        vulnerabilities,
        count: vulnerabilities.length,
      });
    });

    process.on("error", (err) => {
      resolve({
        vulnerabilities: [],
        count: 0,
        error: `Failed to execute nuclei: ${err.message}. Make sure nuclei is installed.`,
      });
    });
  });
}
