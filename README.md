


<div align="center">

  <img src="https://media1.tenor.com/m/Mq6ZeawKT1MAAAAd/nazo-no-kanojo-x-nazo-no-kanojo.gif" width="600" style="border-radius: 10px; box-shadow: 0px 5px 15px rgba(0,0,0,0.3);">

  # AMDUSPAGE

  ![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
  ![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
  ![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
  ![Version](https://img.shields.io/badge/Version-15.0.0-blue?style=for-the-badge)
  ![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

  <p style="font-size: 1.1rem; color: #555;">
    <b>Optimized Messenger Pagebot.</b><br>
    Easy to set up and customize for your own page.<br>
    <span style="background: rgba(255,255,255,0.12); color: #222; padding: 0.2rem 0.5rem; border-radius: 5px;">Built by a solo dev</span>
  </p>

  <p>
    Created by <a href="https://www.facebook.com/seth09asher"><b>Seth Asher Salinguhay</b></a>
  </p>

  <div style="display:flex; justify-content:center; gap:0.5rem; align-items:center; flex-wrap:wrap;">
    <a href="#deployment"><img src="https://img.shields.io/badge/Get%20Started-🚀-brightgreen?style=for-the-badge" alt="Get Started"></a>
    <a href="https://github.com/sethdico/Amduspage/commit" title="Latest Commit"><img src="https://img.shields.io/github/last-commit/sethdico/Amduspage?style=for-the-badge" alt="Last Commit"></a>
    <a href="https://github.com/sethdico/Amduspage/issues" title="Open Issues"><img src="https://img.shields.io/github/issues/sethdico/Amduspage?style=for-the-badge&color=orange" alt="Issues"></a>
  </div>

</div>

<br>

## 📋 Table of Contents
- [📂 Project Structure](#-project-structure)
- [🛠️ Setup & Configuration](#setup--configuration)
- [🚀 Deployment](#-deployment)
- [🤖 Feature List](#-feature-list)
- [🚀 Use the Pagebot Here](#-use-the-pagebot-here)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [⚠️ FAQ](#faq)
- [🛠️ Potential Fixes & Support](#potential-fixes--support)
- [👍 Like & Review](#-like--review)

---

## 📂 Project Structure

A modular architecture designed for scalability and ease of maintenance.

| Directory | Description |
| :--- | :--- |
| `modules/commands/` | **Bot Logic** (AI, Media, Fun, Utility, Admin commands) |
| `modules/core/` | **System Core** (Database, Cache & Queue Managers) |
| `modules/middleware/` | **Security** (Rate limiting & Input Validation) |
| `modules/utils/` | **Utilities** (Helper functions and tools) |
| `page/src/` | **Interface** (Facebook API Wrappers: Carousel, Buttons, Messages) |
| `config/` | **Configuration** (API Endpoints & Constants) |
| `cache/` | **Cache Directory** (Temporary file storage) |
| `tests/` | **Test Suite** (Setup and test files) |
| `index.js` | **Entry Point** (Main Application File) |
| `webhook.js` | **Webhook Handler** (Facebook Messenger webhook processing) |

---

## 🛠️ Setup & Configuration

### Requirements
- **Node.js** >= 16.0.0
- **MongoDB** (for database)

### Installation
1. Clone the repository.
2. Install dependencies with `npm install`.
3. Configure `config/config.json` with your bot's prefix and name.
4. Set up environment variables (see below).
5. Start with `node index.js`.

### Environment Variables
Configure these in your hosting environment (Render/Railway/Replit) or local `.env` file.

<details>
<summary><b>Click to view required variables</b></summary>

| Variable | Description |
| :--- | :--- |
| `PAGE_ACCESS_TOKEN` | Facebook Page Access Token |
| `VERIFY_TOKEN` | Webhook Verification Token |
| `APP_SECRET` | App Secret (for request signing) |
| `ADMINS` | Administrator UIDs (separated by comma) |
| `MONGODB_URI` | MongoDB Connection String |
| `CHIPP_API_KEY` | Amdus AI Main Key |
| `CHIPP_MODEL` | AI Model ID |
| `GEMINI_COOKIE` | Google Gemini `__Secure-1PSID` |
| `OPENROUTER_KEY` | Molmo Vision Key |
| `APY_TOKEN` | Apyhub Token (Tempmail) |
| `GOOGLE_API_KEY` | Google Search API Key |
| `GOOGLE_CX` | Google Search Engine ID |
| `NASA_API_KEY` | NASA Image API |
| `WOLFRAM_APP_ID` | Wolfram Alpha App ID |
| `DICT_API_KEY` | Merriam-Webster Dictionary Key |

</details>

---

## 🚀 Deployment

**1. Install Dependencies**
```bash
npm install
```

**2. Start Application**
```bash
node index.js
```

---

## 🤖 Feature List

**Key Features:**
- **Zero-Prefix Logic**: Commands can be triggered anywhere in your message—no need for prefixes.
- **Tiered Ban System**: Progressive banning with escalating durations for repeated violations.
- **AI Fallback**: Unrecognized messages are seamlessly processed by the main AI assistant.
- **Queue System**: Built-in anti-spam background queue to prevent Facebook token rate-limiting.

### 🧠 Artificial Intelligence
*   `amdus <query>` — Main AI engine (supports image/file analysis).
*   `gemini <query>` — Google Gemini integration with vision capabilities.
*   `copilot <prompt>` — Microsoft Copilot with web search and source support.
*   `perplexity <query>` — Deep reasoning AI model.
*   `venice <query>` — Precise AI model.
*   `webpilot <query>` — Web search AI assistant.
*   `you <query>` — You.com AI search.
*   `sim <message>` — SimSimi chatbot (can be taught responses).

### 🎬 Media Tools
*   `alldl <url>` — Universal media downloader (Facebook, TikTok, YouTube, IG, etc).
*   `pinterest <query>` — Image search returning image attachments.
*   `screenshot <url>` — Captures a live preview of a website.
*   `dalle <prompt>` — AI image generation.
*   `gmage <query>` — Google image search.
*   `lyrics <song>` — Fetches song lyrics.
*   `nasa` — NASA space photo of the day.

### 🛠️ Utilities
*   `tempmail` — Generates disposable email addresses with an inbox viewer.
*   `remind <time> <msg>` — Sets a scheduled reminder (e.g., `10m sleep`).
*   `trans <lang> <text>` — Translates text with audio pronunciation.
*   `dict <word>` — Dictionary and slang definitions.
*   `google <query>` — Traditional Google web search.
*   `wiki <topic>` — Wikipedia search and daily feeds.
*   `wolfram <query>` — Computational knowledge search (math, science).
*   `pokemon <name>` — Pokédex lookup.
*   `joke` — Random joke generator.
*   `48laws <number>` — Random rule from "The 48 Laws of Power".

### 🛡️ Administration
*   `stats` — Displays system metrics (RAM, Uptime, User Count, Top Commands).
*   `getuser` — Search, view, or manage the user database.
*   `ban <id>` / `unban <id>` — Manages user access permissions.
*   `broadcast <msg>` — Sends a global announcement to all users.
*   `maintenance on/off` — Toggles bot maintenance mode.
*   `transcript <session_id>` — View full conversation logs for an AI session.
*   `clean` — Purges temporary cache files.
*   `cmd on/off <name>` — Easily enable or disable specific commands.

---

## 🚀 Use the Pagebot Here

Want to test it out live? Message the bot directly through our Facebook page:  
👉 **[Amduspage Official Bot](https://www.facebook.com/profile.php?id=61585331824038)**

---

## 🤝 Contributing

Want to contribute? Follow these steps:
1. Fork the repository.
2. Create a feature branch.
3. Make your changes and test thoroughly.
4. Submit a pull request.

---

## 📄 License

This project is licensed under the MIT License. See `LICENSE` for details. You are free to use, modify, and distribute this software. 

---

## ⚠️ FAQ

**Q: How do I set up the bot?**  
A: Follow the setup section above for installation and configuration steps.

**Q: Can I add my own commands?**  
A: Yes! Navigate to `modules/commands/` and add your `.js` command files following the existing structure. The bot will automatically load them.

### 📝 Command Template

Use this standardized format when creating new commands:

```javascript
const { http } = require("../utils");

module.exports.config = {
    name: "commandname",
    aliases: ["alias1", "alias2"],
    author: "yourname",
    version: "1.0",
    category: "Category",
    description: "What this command does",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const query = args.join(" ");
    
    if (!query) {
        return reply("📋 **command guide**\n━━━━━━━━━━━━━━━━\nhow to use:\n  commandname <input>\n\nexample:\n  commandname sample");
    }
    
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
    
    try {
        await api.sendMessage("Result here", senderID);
    } catch (e) {
        reply("command failed.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
```

**Important:**
- Use 4-space indentation consistently
- No trailing spaces after property values
- Always use `async function` format for `module.exports.run`
- Include the typing indicator pattern for better UX
- Follow the existing error handling pattern

**Q: Why am I getting errors on startup?**  
A: Check your environment variables (`.env`). Verify that your `PAGE_ACCESS_TOKEN` and `MONGODB_URI` are configured correctly.

---

## 🛠️ Potential Fixes & Support

If you encounter issues or the bot stops replying, try these potential fixes first:

1. **Missing Dependencies Error**: Run `npm install` to ensure all packages are up to date. The bot's auto-installer should handle new commands, but a manual install helps clear errors.
2. **Bot is Online but Not Replying**: Double-check your **Verify Token** and **App Secret** in your Facebook Developer portal. Ensure your webhook is actively subscribed to `messages` and `messaging_postbacks`.
3. **Database/Connection Errors**: Verify that your MongoDB cluster allows access from anywhere (IP `0.0.0.0/0`) in its network access settings.
4. **Clear Build Cache**: If hosted on Render or Railway, try clearing the build cache and doing a manual redeploy to flush out stuck memory queues.

**Still not fixed? Contact the developer:**  
💬 **[Message Seth Asher Salinguhay on Facebook](https://www.facebook.com/seth09asher)**

---

## 👍 Like & Review

If you find this open-source project useful, please drop a star on the repository, follow the[Facebook page](https://www.facebook.com/profile.php?id=61585331824038), and leave a review. Feel free to share it with your friends!

<div align="center">
    <br>
    Open-source and maintained by Sethdico.
</div>
