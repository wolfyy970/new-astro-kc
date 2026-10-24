// @vitest-environment node
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  buildChatRequest,
  buildImagesRequest,
  defaultDeps,
  extractApiKey,
  generateImage,
  imageSize,
  keyStatus,
  listImageModels,
  parseChatResponse,
  parseImagesResponse,
  redact,
  referenceToUrl,
  resolveApiKey,
  type Deps,
} from "./openrouter-image.ts";
import { callTool, handleMessage } from "./openrouter-image-mcp.ts";

const KEY = "sk-or-v1-0123456789abcdef0123456789abcdef";

let dir = "";
let png = Buffer.alloc(0);

beforeAll(async () => {
  png = await sharp({
    create: { width: 6, height: 4, channels: 3, background: "#123456" },
  })
    .png()
    .toBuffer();
});

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "openrouter-image-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("api key", () => {
  it("finds an OpenRouter key among other notes", () => {
    const text = `github=ghp_abc\nopenrouter: ${KEY}\nother=sk-ant-zzz\n`;
    expect(extractApiKey(text)).toBe(KEY);
  });

  it("accepts a file holding only the key, and rejects unrelated text", () => {
    expect(extractApiKey(`  ${"k".repeat(30)}\n`)).toBe("k".repeat(30));
    expect(extractApiKey("my password is hunter2")).toBeNull();
    expect(extractApiKey("")).toBeNull();
  });

  it("prefers OPENROUTER_API_KEY, then OPENROUTER_KEY_FILE, then ~/Developer/api_pass.txt", () => {
    const home = path.join(dir, "home");
    mkdirSync(path.join(home, "Developer"), { recursive: true });
    writeFileSync(path.join(home, "Developer", "api_pass.txt"), `x\n${KEY}\n`);
    const custom = path.join(dir, "custom.txt");
    writeFileSync(custom, "sk-or-v1-custom00000000000000000");

    expect(resolveApiKey({ OPENROUTER_API_KEY: " sk-direct " }, home)).toEqual({
      key: "sk-direct",
      source: "OPENROUTER_API_KEY",
    });
    expect(resolveApiKey({ OPENROUTER_KEY_FILE: custom }, home).key).toBe(
      "sk-or-v1-custom00000000000000000",
    );
    expect(resolveApiKey({ OPENROUTER_API_KEY: "" }, home)).toEqual({
      key: KEY,
      source: path.join(home, "Developer", "api_pass.txt"),
    });
  });

  it("explains a missing key without leaking file contents", () => {
    expect(() => resolveApiKey({}, path.join(dir, "empty"))).toThrow(
      /OPENROUTER_API_KEY/,
    );
    const home = path.join(dir, "home");
    mkdirSync(path.join(home, "Developer"), { recursive: true });
    writeFileSync(
      path.join(home, "Developer", "api_pass.txt"),
      "bank pin 1234",
    );
    let message = "";
    try {
      resolveApiKey({}, home);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/no OpenRouter key/);
    expect(message).not.toContain("1234");
  });

  it("redacts the key from text", () => {
    expect(redact(`bad key ${KEY}!`, KEY)).toBe("bad key [redacted]!");
    expect(redact("nothing", "")).toBe("nothing");
  });
});

describe("references and requests", () => {
  it("turns local files into data URLs and passes URLs through", () => {
    const file = path.join(dir, "ref.png");
    writeFileSync(file, png);
    expect(referenceToUrl("ref.png", dir)).toBe(
      `data:image/png;base64,${png.toString("base64")}`,
    );
    expect(referenceToUrl("https://x.test/a.jpg", dir)).toBe(
      "https://x.test/a.jpg",
    );
    expect(() => referenceToUrl("notes.txt", dir)).toThrow(/must be/);
    expect(() => referenceToUrl("missing.png", dir)).toThrow(/not found/);
  });

  it("builds the chat request with thinking, size, ratio and references first", () => {
    const body = buildChatRequest(
      {
        prompt: "restore it",
        model: "google/gemini-nano-banana-2.1",
        aspectRatio: "16:9",
        resolution: "4K",
        thinking: "high",
        seed: 7,
      },
      ["data:image/png;base64,AAAA"],
    );
    expect(body).toMatchObject({
      model: "google/gemini-nano-banana-2.1",
      modalities: ["image", "text"],
      image_config: { image_size: "4K", aspect_ratio: "16:9" },
      reasoning: { effort: "high" },
      seed: 7,
      stream: false,
    });
    const content = (body.messages as { content: unknown[] }[])[0]!.content;
    expect(content).toEqual([
      { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
      { type: "text", text: "restore it" },
    ]);
  });

  it("builds the images request and omits what was not asked for", () => {
    const body = buildImagesRequest(
      { prompt: "p", model: "m", resolution: "2K", thinking: "high" },
      [],
    );
    expect(body).toEqual({ model: "m", prompt: "p", resolution: "2K", n: 1 });
    expect(
      buildImagesRequest(
        {
          prompt: "p",
          model: "m",
          resolution: "2K",
          thinking: "high",
          aspectRatio: "1:1",
        },
        ["https://x.test/r.png"],
      ),
    ).toMatchObject({
      aspect_ratio: "1:1",
      input_references: [
        { type: "image_url", image_url: { url: "https://x.test/r.png" } },
      ],
    });
  });
});

describe("responses", () => {
  it("reads an embedded image and the cost from a chat response", () => {
    const parsed = parseChatResponse({
      choices: [
        {
          message: {
            images: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${png.toString("base64")}`,
                },
              },
            ],
          },
        },
      ],
      usage: { cost: 0.0612 },
    });
    expect(parsed.image?.mediaType).toBe("image/png");
    expect(parsed.image?.bytes.equals(png)).toBe(true);
    expect(parsed.costUsd).toBe(0.0612);
  });

  it("returns nothing for a text-only chat response", () => {
    expect(
      parseChatResponse({ choices: [{ message: { content: "sorry" } }] }),
    ).toEqual({
      costUsd: undefined,
    });
  });

  it("reads b64_json and media type from an images response", () => {
    const parsed = parseImagesResponse({
      data: [{ b64_json: png.toString("base64"), media_type: "image/webp" }],
      usage: { cost: 0.04 },
    });
    expect(parsed.image?.mediaType).toBe("image/webp");
    expect(parsed.costUsd).toBe(0.04);
  });

  it("reads dimensions from PNG, JPEG and WebP headers", async () => {
    expect(imageSize(png)).toEqual({ width: 6, height: 4 });
    const make = (format: "jpeg" | "webp", width: number, height: number) =>
      sharp({ create: { width, height, channels: 3, background: "#808080" } })
        .toFormat(format)
        .toBuffer();
    expect(imageSize(await make("jpeg", 33, 21))).toEqual({
      width: 33,
      height: 21,
    });
    expect(imageSize(await make("webp", 40, 25))).toEqual({
      width: 40,
      height: 25,
    });
    expect(
      imageSize(Buffer.from("not an image at all, just text")),
    ).toBeUndefined();
  });
});

describe("against a mock OpenRouter", () => {
  type Handler = (
    req: http.IncomingMessage,
    body: string,
  ) => { status: number; json: unknown };
  let server: http.Server;
  let handler: Handler = () => ({ status: 500, json: {} });
  let seen: { method: string; url: string; auth?: string; body: string }[] = [];
  let deps: Deps;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        seen.push({
          method: req.method ?? "",
          url: req.url ?? "",
          auth: req.headers.authorization,
          body,
        });
        const { status, json } = handler(req, body);
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(json));
      });
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  });
  afterAll(() => new Promise<void>((done) => server.close(() => done())));

  beforeEach(() => {
    seen = [];
    deps = {
      ...defaultDeps(),
      env: {
        OPENROUTER_API_KEY: KEY,
        OPENROUTER_BASE_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`,
      },
      cwd: dir,
      homedir: dir,
      retryDelayMs: 0,
      maxRetries: 2,
      now: () => new Date("2026-10-23T12:00:00Z"),
    };
  });

  const chatImage = () => ({
    status: 200,
    json: {
      choices: [
        {
          message: {
            images: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${png.toString("base64")}`,
                },
              },
            ],
          },
        },
      ],
      usage: { cost: 0.0612 },
    },
  });

  it("generates through the chat route, saves the file and never leaks the key", async () => {
    handler = chatImage;
    const result = await generateImage(
      { prompt: "A red panda!", aspectRatio: "16:9", seed: 3 },
      deps,
    );
    expect(result).toMatchObject({
      route: "chat",
      width: 6,
      height: 4,
      costUsd: 0.0612,
      resolution: "4K",
      thinking: "high",
    });
    expect(result.path).toBe(
      path.join(
        dir,
        "openrouter-images",
        "2026-10-23T12-00-00-000Z-a-red-panda.png",
      ),
    );
    expect(readFileSync(result.path).equals(png)).toBe(true);
    expect(seen[0]).toMatchObject({
      method: "POST",
      url: "/api/v1/chat/completions",
      auth: `Bearer ${KEY}`,
    });
    expect(JSON.parse(seen[0]!.body)).toMatchObject({
      image_config: { image_size: "4K", aspect_ratio: "16:9" },
      reasoning: { effort: "high" },
      seed: 3,
    });
  });

  it("honours output_path and fixes its extension to the real media type", async () => {
    handler = () => ({
      status: 200,
      json: {
        data: [{ b64_json: png.toString("base64"), media_type: "image/png" }],
      },
    });
    const result = await generateImage(
      { prompt: "x", route: "images", outputPath: "out/tile.jpg" },
      deps,
    );
    expect(result.path).toBe(path.join(dir, "out", "tile.png"));
    expect(existsSync(result.path)).toBe(true);
    expect(result.thinking).toBeUndefined();
  });

  it("falls back to the images route when the chat shape is rejected", async () => {
    handler = (req) =>
      req.url?.endsWith("/chat/completions")
        ? { status: 400, json: { error: { message: "unsupported field" } } }
        : {
            status: 200,
            json: {
              data: [{ b64_json: png.toString("base64") }],
              usage: { cost: 0.05 },
            },
          };
    const result = await generateImage({ prompt: "x" }, deps);
    expect(result.route).toBe("images");
    expect(seen.map((r) => r.url)).toEqual([
      "/api/v1/chat/completions",
      "/api/v1/images",
    ]);
  });

  it("does not fall back on auth or credit errors, and redacts the key", async () => {
    handler = () => ({
      status: 401,
      json: { error: { message: `No auth for ${KEY}` } },
    });
    const error = await generateImage({ prompt: "x" }, deps).catch(
      (e: Error) => e,
    );
    expect((error as Error).message).toBe(
      "OpenRouter 401: No auth for [redacted]",
    );
    expect(seen).toHaveLength(1);
  });

  it("retries a 429 and then succeeds", async () => {
    let calls = 0;
    handler = () =>
      ++calls < 3
        ? { status: 429, json: { error: { message: "slow down" } } }
        : chatImage();
    const result = await generateImage({ prompt: "x" }, deps);
    expect(result.route).toBe("chat");
    expect(calls).toBe(3);
  });

  it("sends local reference images as data URLs", async () => {
    handler = chatImage;
    writeFileSync(path.join(dir, "in.png"), png);
    await generateImage(
      { prompt: "restore", referenceImages: ["in.png"] },
      deps,
    );
    const content = JSON.parse(seen[0]!.body).messages[0].content;
    expect(content[0].image_url.url).toBe(
      `data:image/png;base64,${png.toString("base64")}`,
    );
  });

  it("lists and filters image models without needing a key", async () => {
    handler = () => ({
      status: 200,
      json: {
        data: [
          {
            id: "google/gemini-nano-banana-2.1",
            name: "Nano Banana 2.1",
            supported_parameters: {
              resolution: { type: "enum", values: ["1K", "2K", "4K"] },
              aspect_ratio: { type: "enum", values: ["1:1", "16:9"] },
              input_references: { type: "range", min: 0, max: 14 },
            },
          },
          {
            id: "openai/gpt-image-1",
            name: "GPT Image 1",
            supported_parameters: {},
          },
        ],
      },
    });
    const models = await listImageModels("banana", {
      ...deps,
      env: { ...deps.env, OPENROUTER_API_KEY: "" },
    });
    expect(models).toEqual([
      {
        id: "google/gemini-nano-banana-2.1",
        name: "Nano Banana 2.1",
        resolutions: ["1K", "2K", "4K"],
        aspectRatios: ["1:1", "16:9"],
        maxReferences: 14,
      },
    ]);
    expect(seen[0]!.auth).toBeUndefined();
  });

  it("reports key status", async () => {
    handler = () => ({
      status: 200,
      json: {
        data: {
          label: "sk-or-v1-abc...xyz",
          usage: 1.25,
          limit: 10,
          limit_remaining: 8.75,
          is_free_tier: false,
        },
      },
    });
    expect(await keyStatus(deps)).toEqual({
      label: "sk-or-v1-abc...xyz",
      usage: 1.25,
      limit: 10,
      limitRemaining: 8.75,
      freeTier: false,
    });
  });

  it("serves tool calls over the MCP handlers", async () => {
    handler = chatImage;
    const ok = await callTool(
      "openrouter_generate_image",
      { prompt: "hello", resolution: "2K" },
      deps,
    );
    expect(ok.isError).toBeUndefined();
    expect(ok.content[0]!.text).toMatch(
      /Saved .*hello\.png\n6×4, .* image\/png\nmodel google\/gemini-nano-banana-2\.1, route chat, resolution 2K, thinking high\ncost \$0\.0612/,
    );

    const bad = await callTool(
      "openrouter_generate_image",
      { prompt: "x", resolution: "8K" },
      deps,
    );
    expect(bad.isError).toBe(true);
    expect(bad.content[0]!.text).toMatch(/resolution must be one of/);

    const noKey = await callTool(
      "openrouter_generate_image",
      { prompt: "x" },
      { ...deps, env: {} },
    );
    expect(noKey.isError).toBe(true);
    expect(noKey.content[0]!.text).toMatch(/No OpenRouter API key/);
  });
});

describe("MCP protocol", () => {
  it("negotiates the protocol version and advertises tools", async () => {
    const init = await handleMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05" },
    });
    expect(init).toMatchObject({
      id: 1,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "openrouter-image" },
      },
    });
    const list = (await handleMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    })) as {
      result: {
        tools: { name: string; inputSchema: { required?: string[] } }[];
      };
    };
    expect(list.result.tools.map((tool) => tool.name)).toEqual([
      "openrouter_generate_image",
      "openrouter_list_image_models",
      "openrouter_key_status",
    ]);
    expect(list.result.tools[0]!.inputSchema.required).toEqual(["prompt"]);
  });

  it("ignores notifications and rejects unknown methods", async () => {
    expect(
      await handleMessage({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    ).toBeUndefined();
    expect(
      await handleMessage({ jsonrpc: "2.0", id: 3, method: "nope" }),
    ).toMatchObject({
      id: 3,
      error: { code: -32601 },
    });
    expect(
      await handleMessage({ jsonrpc: "2.0", id: 4, method: "ping" }),
    ).toEqual({
      jsonrpc: "2.0",
      id: 4,
      result: {},
    });
  });
});
