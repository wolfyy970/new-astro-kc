/**
 * OpenRouter image generation core, shared by the MCP server
 * (`openrouter-image-mcp.ts`) and its tests.
 *
 * Defaults to Google's Nano Banana 2.1 (`google/gemini-nano-banana-2.1`), the
 * same model the Higgsfield workflow uses. Two routes reach it:
 *
 *   chat    /chat/completions with `modalities: ["image","text"]`; the only
 *           route that exposes thinking effort and a seed.
 *   images  the dedicated /images API; resolution, aspect ratio and up to 14
 *           reference images, but no thinking control.
 *
 * `chat` is tried first and falls back to `images` when OpenRouter rejects the
 * request shape or returns no image. The API key never leaves this process:
 * it is read from OPENROUTER_API_KEY or a key file, sent only as a Bearer
 * header, and scrubbed from every error message.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DEFAULT_MODEL = "google/gemini-nano-banana-2.1";
export const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_KEY_FILE = path.join("Developer", "api_pass.txt");

export const RESOLUTIONS = ["1K", "2K", "4K"] as const;
export const ASPECT_RATIOS = [
  "1:1",
  "1:4",
  "1:8",
  "2:3",
  "3:2",
  "3:4",
  "4:1",
  "4:3",
  "4:5",
  "5:4",
  "8:1",
  "9:16",
  "16:9",
  "21:9",
] as const;
export const THINKING_LEVELS = ["none", "minimal", "high"] as const;
export const ROUTES = ["chat", "images"] as const;
export const MAX_REFERENCES = 14;

const MAX_REFERENCE_BYTES = 20 * 1024 * 1024;
const MAX_PROMPT_CHARS = 20_000;
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const MAX_BACKOFF_MS = 60_000;

export type Resolution = (typeof RESOLUTIONS)[number];
export type AspectRatio = (typeof ASPECT_RATIOS)[number];
export type Thinking = (typeof THINKING_LEVELS)[number];
export type Route = (typeof ROUTES)[number];

export interface GenerateInput {
  prompt: string;
  model?: string;
  /** Local file paths, http(s) URLs or data URLs; up to 14. */
  referenceImages?: string[];
  aspectRatio?: AspectRatio;
  resolution?: Resolution;
  thinking?: Thinking;
  seed?: number;
  route?: Route;
  /** Where to save the image; defaults to ./openrouter-images/<stamp>-<slug>. */
  outputPath?: string;
}

export interface GenerateResult {
  path: string;
  bytes: number;
  mediaType: string;
  width?: number;
  height?: number;
  route: Route;
  model: string;
  resolution: Resolution;
  aspectRatio?: AspectRatio;
  thinking?: Thinking;
  costUsd?: number;
  seconds: number;
}

export interface Deps {
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
  homedir: string;
  cwd: string;
  now: () => Date;
  timeoutMs: number;
  /** Retries for 429/5xx; the wait doubles each time, capped at a minute. */
  maxRetries: number;
  retryDelayMs: number;
}

export const defaultDeps = (): Deps => ({
  env: process.env,
  fetchImpl: fetch,
  homedir: os.homedir(),
  cwd: process.cwd(),
  now: () => new Date(),
  timeoutMs: 300_000,
  maxRetries: 6,
  retryDelayMs: 2_000,
});

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

// ── API key ──────────────────────────────────────────────────────────────

const KEY_PATTERN = /sk-or-[A-Za-z0-9_-]{16,}/;

/** Pull an OpenRouter key out of a file that may hold other notes or keys. */
export function extractApiKey(text: string): string | null {
  const match = KEY_PATTERN.exec(text);
  if (match) return match[0];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const [only] = lines;
  if (lines.length === 1 && only && /^[^\s=:]{20,}$/.test(only)) return only;
  return null;
}

export function resolveApiKey(
  env: NodeJS.ProcessEnv,
  homedir: string,
): { key: string; source: string } {
  const direct = env.OPENROUTER_API_KEY?.trim();
  if (direct) return { key: direct, source: "OPENROUTER_API_KEY" };

  const files = [
    env.OPENROUTER_KEY_FILE?.trim(),
    path.join(homedir, DEFAULT_KEY_FILE),
  ].filter((file): file is string => Boolean(file));

  for (const file of files) {
    let text: string;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const key = extractApiKey(text);
    if (key) return { key, source: file };
    throw new OpenRouterError(
      `${file} exists but no OpenRouter key (sk-or-…) was found in it.`,
    );
  }
  throw new OpenRouterError(
    "No OpenRouter API key found. Set OPENROUTER_API_KEY, or set OPENROUTER_KEY_FILE to a file that contains it (default: ~/Developer/api_pass.txt).",
  );
}

export function redact(text: string, key: string): string {
  return key ? text.split(key).join("[redacted]") : text;
}

// ── Reference images ─────────────────────────────────────────────────────

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/** Turn a reference (URL, data URL or local path) into a URL OpenRouter accepts. */
export function referenceToUrl(reference: string, cwd: string): string {
  if (/^(https?:|data:image\/)/i.test(reference)) return reference;
  const file = path.resolve(cwd, reference);
  const mime = MIME_BY_EXT[path.extname(file).toLowerCase()];
  if (!mime) {
    throw new OpenRouterError(
      `Reference image ${reference} must be .png, .jpg, .jpeg, .webp or .gif.`,
    );
  }
  let bytes: Buffer;
  try {
    bytes = fs.readFileSync(file);
  } catch {
    throw new OpenRouterError(`Reference image not found: ${file}`);
  }
  if (bytes.length > MAX_REFERENCE_BYTES) {
    throw new OpenRouterError(
      `Reference image ${file} is larger than ${MAX_REFERENCE_BYTES / 1024 / 1024} MB.`,
    );
  }
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

// ── Requests ─────────────────────────────────────────────────────────────

interface ResolvedInput {
  prompt: string;
  model: string;
  aspectRatio?: AspectRatio;
  resolution: Resolution;
  thinking: Thinking;
  seed?: number;
}

export function buildChatRequest(
  input: ResolvedInput,
  referenceUrls: string[],
): Record<string, unknown> {
  const content: unknown[] = referenceUrls.map((url) => ({
    type: "image_url",
    image_url: { url },
  }));
  content.push({ type: "text", text: input.prompt });
  const body: Record<string, unknown> = {
    model: input.model,
    messages: [{ role: "user", content }],
    modalities: ["image", "text"],
    image_config: {
      image_size: input.resolution,
      ...(input.aspectRatio ? { aspect_ratio: input.aspectRatio } : {}),
    },
    reasoning: { effort: input.thinking },
    stream: false,
  };
  if (input.seed !== undefined) body.seed = input.seed;
  return body;
}

export function buildImagesRequest(
  input: ResolvedInput,
  referenceUrls: string[],
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: input.model,
    prompt: input.prompt,
    resolution: input.resolution,
    n: 1,
  };
  if (input.aspectRatio) body.aspect_ratio = input.aspectRatio;
  if (referenceUrls.length) {
    body.input_references = referenceUrls.map((url) => ({
      type: "image_url",
      image_url: { url },
    }));
  }
  return body;
}

// ── Responses ────────────────────────────────────────────────────────────

export interface DecodedImage {
  bytes: Buffer;
  mediaType: string;
}

export interface ParsedImage {
  image?: DecodedImage;
  /** Set when the response points at a hosted image instead of embedding it. */
  url?: string;
  costUsd?: number;
}

type Json = Record<string, unknown>;
const asObject = (value: unknown): Json | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : undefined;

export function decodeDataUrl(url: string): DecodedImage | undefined {
  const match = /^data:([^;,]+)?(?:;base64)?,([\s\S]*)$/.exec(url);
  if (!match?.[2]) return undefined;
  return {
    bytes: Buffer.from(match[2], "base64"),
    mediaType: match[1] ?? "image/png",
  };
}

const costOf = (json: Json): number | undefined => {
  const cost = asObject(json.usage)?.cost;
  return typeof cost === "number" ? cost : undefined;
};

function fromImageUrl(value: unknown): Pick<ParsedImage, "image" | "url"> {
  const url = asObject(asObject(value)?.image_url)?.url;
  if (typeof url !== "string") return {};
  return url.startsWith("data:") ? { image: decodeDataUrl(url) } : { url };
}

export function parseChatResponse(json: unknown): ParsedImage {
  const root = asObject(json) ?? {};
  const choices = Array.isArray(root.choices) ? root.choices : [];
  const message = asObject(asObject(choices[0])?.message);
  const parts: unknown[] = [];
  if (Array.isArray(message?.images)) parts.push(...message.images);
  if (Array.isArray(message?.content)) parts.push(...message.content);
  for (const part of parts) {
    const found = fromImageUrl(part);
    if (found.image || found.url) return { ...found, costUsd: costOf(root) };
  }
  return { costUsd: costOf(root) };
}

export function parseImagesResponse(json: unknown): ParsedImage {
  const root = asObject(json) ?? {};
  const first = Array.isArray(root.data) ? asObject(root.data[0]) : undefined;
  const b64 = first?.b64_json;
  if (typeof b64 === "string" && b64) {
    const mediaType =
      typeof first?.media_type === "string" ? first.media_type : "image/png";
    return {
      image: { bytes: Buffer.from(b64, "base64"), mediaType },
      costUsd: costOf(root),
    };
  }
  if (typeof first?.url === "string") {
    return { url: first.url, costUsd: costOf(root) };
  }
  return { costUsd: costOf(root) };
}

/** Width/height from the file header (PNG, JPEG, WebP); undefined if unknown. */
export function imageSize(
  bytes: Buffer,
): { width: number; height: number } | undefined {
  if (bytes.length > 24 && bytes.readUInt32BE(0) === 0x89504e47) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length > 30 && bytes.toString("latin1", 0, 4) === "RIFF") {
    const kind = bytes.toString("latin1", 12, 16);
    if (kind === "VP8X") {
      return {
        width: 1 + bytes.readUIntLE(24, 3),
        height: 1 + bytes.readUIntLE(27, 3),
      };
    }
    if (kind === "VP8L") {
      const bits = bytes.readUInt32LE(21);
      return {
        width: 1 + (bits & 0x3fff),
        height: 1 + ((bits >> 14) & 0x3fff),
      };
    }
    if (kind === "VP8 ") {
      return {
        width: bytes.readUInt16LE(26) & 0x3fff,
        height: bytes.readUInt16LE(28) & 0x3fff,
      };
    }
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return undefined;
      const marker = bytes[offset + 1] as number;
      const length = bytes.readUInt16BE(offset + 2);
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        ![0xc4, 0xc8, 0xcc].includes(marker)
      ) {
        return {
          height: bytes.readUInt16BE(offset + 5),
          width: bytes.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }
  return undefined;
}

// ── HTTP ─────────────────────────────────────────────────────────────────

const baseUrl = (deps: Deps): string =>
  (deps.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );

function errorMessage(text: string): string {
  try {
    const error = asObject(asObject(JSON.parse(text))?.error);
    const message = error?.message;
    if (typeof message === "string" && message) return message;
  } catch {
    // not JSON; fall through to the raw text
  }
  return text.slice(0, 500);
}

async function request(
  deps: Deps,
  key: string | undefined,
  method: "GET" | "POST",
  route: string,
  body?: unknown,
): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Title": "kc-portfolio openrouter-image MCP",
  };
  if (key) headers.Authorization = `Bearer ${key}`;

  for (let attempt = 0; ; attempt++) {
    const response = await deps.fetchImpl(`${baseUrl(deps)}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(deps.timeoutMs),
    });
    if (response.ok) return response.json();
    if (RETRYABLE_STATUS.has(response.status) && attempt < deps.maxRetries) {
      const advised = Number(response.headers.get("retry-after")) * 1000;
      const wait = Math.min(
        Number.isFinite(advised) && advised > 0
          ? advised
          : deps.retryDelayMs * 2 ** attempt,
        MAX_BACKOFF_MS,
      );
      await new Promise((done) => setTimeout(done, wait));
      continue;
    }
    const text = await response.text();
    throw new OpenRouterError(
      `OpenRouter ${response.status}: ${redact(errorMessage(text), key ?? "")}`,
      response.status,
    );
  }
}

async function download(deps: Deps, url: string): Promise<DecodedImage> {
  const response = await deps.fetchImpl(url, {
    signal: AbortSignal.timeout(deps.timeoutMs),
  });
  if (!response.ok) {
    throw new OpenRouterError(`Image download failed: ${response.status}`);
  }
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    mediaType: response.headers.get("content-type") ?? "image/png",
  };
}

// ── Generation ───────────────────────────────────────────────────────────

const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "image";

function outputFile(
  input: GenerateInput,
  mediaType: string,
  deps: Deps,
): string {
  const ext = EXT_BY_MIME[mediaType.split(";")[0] ?? ""] ?? ".png";
  if (input.outputPath) {
    const file = path.resolve(deps.cwd, input.outputPath);
    return file.slice(0, file.length - path.extname(file).length) + ext;
  }
  const stamp = deps.now().toISOString().replace(/[:.]/g, "-");
  return path.join(
    deps.cwd,
    "openrouter-images",
    `${stamp}-${slug(input.prompt)}${ext}`,
  );
}

const shouldFallBack = (error: unknown): boolean =>
  error instanceof OpenRouterError &&
  (error.status === undefined || [400, 404, 422].includes(error.status));

export async function generateImage(
  input: GenerateInput,
  deps: Deps = defaultDeps(),
): Promise<GenerateResult> {
  const prompt = input.prompt?.trim();
  if (!prompt) throw new OpenRouterError("prompt is required.");
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw new OpenRouterError(
      `prompt is longer than ${MAX_PROMPT_CHARS} characters.`,
    );
  }
  const references = input.referenceImages ?? [];
  if (references.length > MAX_REFERENCES) {
    throw new OpenRouterError(`At most ${MAX_REFERENCES} reference images.`);
  }

  const { key } = resolveApiKey(deps.env, deps.homedir);
  const resolved: ResolvedInput = {
    prompt,
    model: input.model?.trim() || DEFAULT_MODEL,
    aspectRatio: input.aspectRatio,
    resolution: input.resolution ?? "4K",
    thinking: input.thinking ?? "high",
    seed: input.seed,
  };
  const referenceUrls = references.map((ref) => referenceToUrl(ref, deps.cwd));
  const started = Date.now();

  const viaChat = async (): Promise<ParsedImage> =>
    parseChatResponse(
      await request(
        deps,
        key,
        "POST",
        "/chat/completions",
        buildChatRequest(resolved, referenceUrls),
      ),
    );
  const viaImages = async (): Promise<ParsedImage> =>
    parseImagesResponse(
      await request(
        deps,
        key,
        "POST",
        "/images",
        buildImagesRequest(resolved, referenceUrls),
      ),
    );

  let route: Route = input.route ?? "chat";
  let parsed: ParsedImage;
  if (route === "images") {
    parsed = await viaImages();
  } else {
    try {
      parsed = await viaChat();
      if (!parsed.image && !parsed.url) {
        throw new OpenRouterError("The chat route returned no image.");
      }
    } catch (error) {
      if (!shouldFallBack(error)) throw error;
      route = "images";
      parsed = await viaImages();
    }
  }

  const image =
    parsed.image ?? (parsed.url ? await download(deps, parsed.url) : undefined);
  if (!image?.bytes.length) {
    throw new OpenRouterError("OpenRouter returned no image data.");
  }

  const file = outputFile(input, image.mediaType, deps);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, image.bytes);
  const size = imageSize(image.bytes);

  return {
    path: file,
    bytes: image.bytes.length,
    mediaType: image.mediaType,
    ...size,
    route,
    model: resolved.model,
    resolution: resolved.resolution,
    aspectRatio: resolved.aspectRatio,
    thinking: route === "chat" ? resolved.thinking : undefined,
    costUsd: parsed.costUsd,
    seconds: Math.round((Date.now() - started) / 100) / 10,
  };
}

// ── Discovery and account ────────────────────────────────────────────────

export interface ImageModelSummary {
  id: string;
  name: string;
  resolutions: string[];
  aspectRatios: string[];
  maxReferences?: number;
}

const enumValues = (parameter: unknown): string[] => {
  const values = asObject(parameter)?.values;
  return Array.isArray(values) ? values.map(String) : [];
};

/** Public endpoint; no key needed. */
export async function listImageModels(
  query: string | undefined,
  deps: Deps = defaultDeps(),
): Promise<ImageModelSummary[]> {
  const json = asObject(
    await request(deps, undefined, "GET", "/images/models"),
  );
  const data = Array.isArray(json?.data) ? json.data : [];
  const needle = query?.trim().toLowerCase();
  return data.flatMap((entry): ImageModelSummary[] => {
    const model = asObject(entry);
    const id = model?.id;
    if (typeof id !== "string") return [];
    const name = typeof model?.name === "string" ? model.name : id;
    if (needle && !`${id} ${name}`.toLowerCase().includes(needle)) return [];
    const params = asObject(model?.supported_parameters);
    const refs = asObject(params?.input_references)?.max;
    return [
      {
        id,
        name,
        resolutions: enumValues(params?.resolution),
        aspectRatios: enumValues(params?.aspect_ratio),
        maxReferences: typeof refs === "number" ? refs : undefined,
      },
    ];
  });
}

export interface KeyStatus {
  label?: string;
  usage?: number;
  limit?: number | null;
  limitRemaining?: number | null;
  freeTier?: boolean;
}

export async function keyStatus(
  deps: Deps = defaultDeps(),
): Promise<KeyStatus> {
  const { key } = resolveApiKey(deps.env, deps.homedir);
  const data = asObject(
    asObject(await request(deps, key, "GET", "/key"))?.data,
  );
  const num = (value: unknown): number | null | undefined =>
    typeof value === "number" || value === null ? value : undefined;
  return {
    label: typeof data?.label === "string" ? data.label : undefined,
    usage: typeof data?.usage === "number" ? data.usage : undefined,
    limit: num(data?.limit),
    limitRemaining: num(data?.limit_remaining),
    freeTier:
      typeof data?.is_free_tier === "boolean" ? data.is_free_tier : undefined,
  };
}
