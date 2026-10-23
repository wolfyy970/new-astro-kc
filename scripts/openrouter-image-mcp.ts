/**
 * MCP server (stdio) for OpenRouter image generation, defaulting to Nano
 * Banana 2.1. Registered for this project in `.mcp.json`.
 *
 *   npx tsx scripts/openrouter-image-mcp.ts
 *
 * Tools: openrouter_generate_image, openrouter_list_image_models,
 * openrouter_key_status. The API key comes from OPENROUTER_API_KEY, else
 * OPENROUTER_KEY_FILE, else ~/Developer/api_pass.txt (see openrouter-image.ts).
 * Protocol traffic is newline-delimited JSON-RPC on stdout; logs go to stderr.
 */
import readline from "node:readline";
import { pathToFileURL } from "node:url";
import {
  ASPECT_RATIOS,
  DEFAULT_MODEL,
  MAX_REFERENCES,
  RESOLUTIONS,
  ROUTES,
  THINKING_LEVELS,
  defaultDeps,
  generateImage,
  keyStatus,
  listImageModels,
  type AspectRatio,
  type Deps,
  type GenerateResult,
  type Resolution,
  type Route,
  type Thinking,
} from "./openrouter-image.ts";

const SERVER_INFO = { name: "openrouter-image", version: "1.0.0" };
const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const TOOLS = [
  {
    name: "openrouter_generate_image",
    description: `Generate or edit an image with ${DEFAULT_MODEL} (Nano Banana 2.1) through OpenRouter and save it to disk. Returns the saved file path, size, route used and cost; open the file to inspect it. Pass reference_images to edit, restore or upscale existing images.`,
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "What to generate, or how to edit the reference images.",
        },
        reference_images: {
          type: "array",
          items: { type: "string" },
          maxItems: MAX_REFERENCES,
          description:
            "Local file paths, http(s) URLs or data URLs (png, jpg, webp, gif).",
        },
        aspect_ratio: { type: "string", enum: [...ASPECT_RATIOS] },
        resolution: {
          type: "string",
          enum: [...RESOLUTIONS],
          description: "Output size tier. Default 4K.",
        },
        thinking: {
          type: "string",
          enum: [...THINKING_LEVELS],
          description:
            "Reasoning effort before drawing (chat route only). Default high; it helps text fidelity.",
        },
        seed: { type: "integer", description: "Chat route only." },
        route: {
          type: "string",
          enum: [...ROUTES],
          description:
            "chat (default, supports thinking and seed, falls back to images on failure) or images.",
        },
        output_path: {
          type: "string",
          description:
            "Where to save, relative to the server's working directory. Default ./openrouter-images/<timestamp>-<prompt>.<ext>",
        },
        model: {
          type: "string",
          description: `OpenRouter model slug. Default ${DEFAULT_MODEL}.`,
        },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "openrouter_list_image_models",
    description:
      "List OpenRouter image models with their resolutions, aspect ratios and reference-image limits. No API key needed.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Filter by name or slug, e.g. 'banana'.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "openrouter_key_status",
    description:
      "Show the configured OpenRouter key's label, usage and remaining credit limit. Never reveals the key.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

interface RpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

const text = (value: string, isError = false): ToolResult => ({
  content: [{ type: "text", text: value }],
  ...(isError ? { isError: true } : {}),
});

const usd = (value: number | null | undefined): string =>
  typeof value === "number" ? `$${value.toFixed(4)}` : "n/a";

function describeResult(result: GenerateResult): string {
  const dims =
    result.width && result.height ? `${result.width}×${result.height}, ` : "";
  return [
    `Saved ${result.path}`,
    `${dims}${(result.bytes / 1024 / 1024).toFixed(2)} MB ${result.mediaType}`,
    `model ${result.model}, route ${result.route}, resolution ${result.resolution}` +
      (result.aspectRatio ? `, aspect ${result.aspectRatio}` : "") +
      (result.thinking ? `, thinking ${result.thinking}` : ""),
    `cost ${usd(result.costUsd)}, ${result.seconds}s`,
  ].join("\n");
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value ? value : undefined;

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  name: string,
): T | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
  ) {
    return value as T;
  }
  throw new Error(`${name} must be one of: ${allowed.join(", ")}.`);
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  deps: Deps = defaultDeps(),
): Promise<ToolResult> {
  try {
    if (name === "openrouter_generate_image") {
      const references = args.reference_images;
      if (references !== undefined && !Array.isArray(references)) {
        throw new Error("reference_images must be an array of strings.");
      }
      const seed = args.seed;
      if (seed !== undefined && !Number.isInteger(seed)) {
        throw new Error("seed must be an integer.");
      }
      const result = await generateImage(
        {
          prompt: typeof args.prompt === "string" ? args.prompt : "",
          model: optionalString(args.model),
          referenceImages: references?.map(String),
          aspectRatio: oneOf<AspectRatio>(
            args.aspect_ratio,
            ASPECT_RATIOS,
            "aspect_ratio",
          ),
          resolution: oneOf<Resolution>(
            args.resolution,
            RESOLUTIONS,
            "resolution",
          ),
          thinking: oneOf<Thinking>(args.thinking, THINKING_LEVELS, "thinking"),
          seed: seed as number | undefined,
          route: oneOf<Route>(args.route, ROUTES, "route"),
          outputPath: optionalString(args.output_path),
        },
        deps,
      );
      return text(describeResult(result));
    }
    if (name === "openrouter_list_image_models") {
      const models = await listImageModels(optionalString(args.query), deps);
      if (!models.length) return text("No image models matched.");
      return text(
        models
          .map(
            (model) =>
              `${model.id}  (${model.name})\n  resolutions: ${model.resolutions.join(", ") || "n/a"}` +
              `\n  aspect ratios: ${model.aspectRatios.join(", ") || "n/a"}` +
              `\n  max reference images: ${model.maxReferences ?? "n/a"}`,
          )
          .join("\n\n"),
      );
    }
    if (name === "openrouter_key_status") {
      const status = await keyStatus(deps);
      return text(
        [
          `label: ${status.label ?? "n/a"}`,
          `usage: ${usd(status.usage)}`,
          `limit: ${status.limit === null ? "none" : usd(status.limit)}`,
          `remaining: ${status.limitRemaining === null ? "unlimited" : usd(status.limitRemaining)}`,
          `free tier: ${status.freeTier ?? "n/a"}`,
        ].join("\n"),
      );
    }
    return text(`Unknown tool: ${name}`, true);
  } catch (error) {
    return text(error instanceof Error ? error.message : String(error), true);
  }
}

/** Returns the JSON-RPC response for a request, or undefined for notifications. */
export async function handleMessage(
  message: RpcRequest,
  deps: Deps = defaultDeps(),
): Promise<Record<string, unknown> | undefined> {
  const { id, method, params } = message;
  if (id === undefined) return undefined; // notification (e.g. initialized)

  const ok = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  const fail = (code: number, messageText: string) => ({
    jsonrpc: "2.0",
    id,
    error: { code, message: messageText },
  });

  switch (method) {
    case "initialize": {
      const requested = params?.protocolVersion;
      return ok({
        protocolVersion:
          typeof requested === "string" && PROTOCOLS.includes(requested)
            ? requested
            : PROTOCOLS[0],
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions:
          "OpenRouter image generation with Nano Banana 2.1. Generated files are saved to disk; open the returned path to inspect them.",
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: TOOLS });
    case "tools/call": {
      const name = params?.name;
      if (typeof name !== "string") return fail(-32602, "Missing tool name.");
      const args = params?.arguments;
      return ok(
        await callTool(
          name,
          args && typeof args === "object"
            ? (args as Record<string, unknown>)
            : {},
          deps,
        ),
      );
    }
    default:
      return fail(-32601, `Method not found: ${method}`);
  }
}

function main(): void {
  const lines = readline.createInterface({ input: process.stdin });
  const pending = new Set<Promise<void>>();
  lines.on("line", (line) => {
    if (!line.trim()) return;
    let message: RpcRequest;
    try {
      message = JSON.parse(line) as RpcRequest;
    } catch {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        }) + "\n",
      );
      return;
    }
    const work = handleMessage(message)
      .then((response) => {
        if (response) process.stdout.write(JSON.stringify(response) + "\n");
      })
      .catch((error: unknown) => {
        console.error("openrouter-image MCP:", error);
      })
      .finally(() => pending.delete(work));
    pending.add(work);
  });
  // Let in-flight generations finish after the client closes stdin.
  lines.on("close", () => {
    void Promise.allSettled(pending).then(() => process.exit(0));
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
