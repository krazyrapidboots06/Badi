const OpenAI = require('openai');
const { CHIPP_API_KEY, CHIPP_MODEL } = process.env;

const openai = new OpenAI({
    apiKey: CHIPP_API_KEY,
    baseURL: 'https://app.chipp.ai/api/v1'
});

async function askChipp(prompt, url, session) {
    if (!CHIPP_API_KEY || !CHIPP_MODEL) return { error: true };

    const body = {
        model: CHIPP_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        temperature: 0.5,
        top_p: 1
    };

    if (session?.chatSessionId) {
        body.chatSessionId = session.chatSessionId;
    }

    try {
        const response = await openai.chat.completions.create(body);
        return { data: response };
    } catch (e) {
        console.error('Chipp API error:', e.message);
        return { error: true };
    }
}

module.exports = { askChipp };
