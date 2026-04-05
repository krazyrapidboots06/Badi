


<div align="center">

  <img src="https://media1.tenor.com/m/Mq6ZeawKT1MAAAAd/nazo-no-kanojo-x-nazo-no-kanojo.gif" width="600" style="border-radius: 10px; box-shadow: 0px 5px 15px rgba(0,0,0,0.3);">

  # AMDUSPAGE

  ![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
  ![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
  ![Version](https://img.shields.io/badge/Version-15.0.0-blue?style=for-the-badge)
  ![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

  <p style="font-size: 1.1rem; color: #555;">
    <b>Messenger Pagebot.</b><br>
    Easy to set up and use.<br>
    Built by a solo dev
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
- [🛠️ Setup & Configuration](#️-setup--configuration)
- [🚀 Deployment](#-deployment)
- [🤖 Features](#-features)
- [🚀 Try the Bot](#-try-the-bot)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [⚠️ FAQ](#-faq)
- [🛠️ Support](#️-support)

---

## 📂 Project Structure

Simple and organized structure.

| Directory | What it does |
| :--- | :--- |
| `modules/commands/` | Bot commands (AI, Media, Fun, Admin) |
| `modules/core/` | Database, cache, and system core |
| `modules/middleware/` | Security and rate limiting |
| `modules/utils/` | Helper functions |
| `page/src/` | Facebook API tools |
| `config/` | Configuration files |
| `cache/` | Temporary storage |
| `tests/` | Test files |
| `index.js` | Main app file |
| `webhook.js` | Facebook webhook handler |

---

## 🛠️ Setup & Configuration

### Requirements
- **Node.js** >= 16.0.0
- **MongoDB** (optional but recommended)

### Installation
1. Clone the repository
2. Run `npm install`
3. Set up environment variables
4. Start with `node index.js`

### Environment Variables
Set these in your hosting environment or `.env` file.

<details>
<summary><b>Required variables</b></summary>

| Variable | What it's for |
| :--- | :--- |
| `PAGE_ACCESS_TOKEN` | Facebook Page Access Token |
| `VERIFY_TOKEN` | Webhook verification |
| `ADMINS` | Admin user IDs (comma separated) |

</details>

<details>
<summary><b>Optional variables</b></summary>

| Variable | What it's for |
| :--- | :--- |
| `MONGODB_URI` | MongoDB connection |
| `OPENAI_API_KEY` | OpenAI API |
| `NODE_ENV` | Environment (development/production) |
| `PORT` | Server port (default: 8080) |

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

**3. Set up Facebook Webhook**
- Point your webhook to `https://your-domain.com/webhook`
- Subscribe to `messages` and `messaging_postbacks`

---

## 🤖 Features

### 🧠 AI Commands
- `amdus <query>` - Main AI with image analysis
- `gemini <query>` - Google Gemini with vision
- `copilot <prompt>` - Microsoft Copilot with web search
- `perplexity <query>` - Deep reasoning AI
- `venice <query>` - Precise AI model
- `webpilot <query>` - Web search AI
- `you <query>` - You.com AI search
- `sim <message>` - SimSimi chatbot

### 🎬 Media Tools
- `alldl <url>` - Download from Facebook, TikTok, YouTube, etc.
- `pinterest <query>` - Image search
- `screenshot <url>` - Website screenshot
- `dalle <prompt>` - AI image generation
- `gmage <query>` - Google image search
- `lyrics <song>` - Song lyrics
- `nasa` - NASA photo of the day

### 🛠️ Utilities
- `tempmail` - Disposable email with inbox
- `remind <time> <msg>` - Set reminders (e.g., `10m sleep`)
- `trans <lang> <text>` - Translate text
- `dict <word>` - Dictionary definitions
- `google <query>` - Google search
- `wiki <topic>` - Wikipedia search
- `wolfram <query>` - Math and science answers
- `pokemon <name>` - Pokémon info
- `joke` - Random jokes
- `48laws <number>` - 48 Laws of Power

### 🛡️ Admin Commands
- `stats` - System stats and metrics
- `getuser` - User database search
- `ban <id>` / `unban <id>` - User management
- `broadcast <msg>` - Send message to all users
- `maintenance on/off` - Toggle maintenance mode
- `transcript <session_id>` - View conversation logs
- `clean` - Clear cache files
- `cmd on/off <name>` - Enable/disable commands

---

## 🚀 Try the Bot

Want to test it? Message the bot directly:  
👉 **[Amduspage Bot](https://www.facebook.com/profile.php?id=61585331824038)**

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License. You're free to use, modify, and distribute this software.

---

## ⚠️ FAQ

**Q: How do I add my own commands?**  
A: Add `.js` files to `modules/commands/` following the existing structure.

### Command Template

```javascript
module.exports.config = {
    name: "commandname",
    author: "yourname",
    category: "Category",
    description: "What this command does",
    adminOnly: false,
    cooldown: 5
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    
    if (!query) {
        return reply("how to use: commandname <input>");
    }
    
    try {
        await api.sendMessage("Result here", event.sender.id);
    } catch (e) {
        reply("something went wrong");
    }
};
```

**Q: Bot is online but not replying?**  
A: Check your webhook setup and verify tokens in Facebook Developer portal.

---

## 🛠️ Support

If you need help:

1. **Missing Dependencies**: Run `npm install`
2. **Webhook Issues**: Verify your webhook is subscribed to messages
3. **Database Problems**: Check MongoDB connection settings

**Still need help? Message me:**  
💬 **[Seth Asher on Facebook](https://www.facebook.com/seth09asher)**

---

<div align="center">
    <br>
    Open-source by Sethdico
</div>
