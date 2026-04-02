const OpenAI = require('openai');
const { CHIPP_API_KEY, CHIPP_MODEL, DEBUG_AI } = process.env;

const openai = new OpenAI({
  apiKey: CHIPP_API_KEY,
  baseURL: 'https://app.chipp.ai/api/v1'
});

async function askChipp(prompt, url, session) {
  if (!CHIPP_API_KEY) return { error: true, message: "Missing CHIPP_API_KEY in .env" };
  if (!CHIPP_MODEL) return { error: true, message: "Missing CHIPP_MODEL in .env" };

  let content = prompt || "describe this image";
  if (url) content = `[image: ${url}]\n\n${content}`;

  const messages = [{ role: "user", content }];
  const body = {
    model: CHIPP_MODEL,
    messages,
    chatSessionId: session?.chatSessionId,
    stream: false,
    temperature: 0.5,
    top_p: 1
  };

  if (DEBUG_AI) {
    try { console.log("askChipp -> body:", JSON.stringify(body, null, 2)); } catch (_) {}
  }

  try {
    const response = await openai.chat.completions.create(body);

    if (DEBUG_AI) {
      try { console.log("askChipp <- response:", JSON.stringify(response, null, 2)); } catch(_) {}
    }

    return { data: response };
  } catch (e) {
    console.error("askChipp error:", e?.message || e);
    const errorMsg = e?.error?.message || e?.message || "ai request failed";
    return { error: true, message: errorMsg };
  }
}

module.exports = { askChipp };
