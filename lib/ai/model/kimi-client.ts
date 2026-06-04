type KimiMessage = {
  role: "system" | "user";
  content: string;
};

type KimiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const DEFAULT_AI_BASE_URL = "https://ckey.vn/v1/chat/completions";
const AI_REQUEST_TIMEOUT_MS = 25_000;

export async function createKimiJsonCompletion(messages: KimiMessage[], timeoutMs = AI_REQUEST_TIMEOUT_MS) {
  const baseUrl = process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!apiKey) {
    throw new Error("Missing AI_API_KEY");
  }

  if (!model) {
    throw new Error("Missing AI_MODEL");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    const errorBody = await readSafeErrorBody(response);
    console.error("AI completion request failed", {
      status: response.status,
      body: errorBody,
      baseUrl,
      model,
    });
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = (await response.json()) as KimiChatResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Kimi response did not include content");
  }

  return content;
}

async function readSafeErrorBody(response: Response) {
  const text = await response.text();
  return text.slice(0, 1000);
}
