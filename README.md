<div align="center">

<img src="https://media1.tenor.com/m/Mq6ZeawKT1MAAAAd/nazo-no-kanojo-x-nazo-no-kanojo.gif" width="600">

# AMDUSPAGE

![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Version](https://img.shields.io/badge/Version-15.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Optimized Messenger Pagebot.**  
Easy to set up and customize for your own page.  
Built by a solo dev

Created by **[Seth Asher Salinguhay](https://www.facebook.com/seth09asher)**

</div>

---

## 📋 Table of Contents
- [📂 Project Structure](#-project-structure)
- [🛠️ Setup](#-setup)
- [🚀 Deployment](#-deployment)
- [🤖 Commands](#-commands)
- [📄 License](#-license)
- [👍 Like & Review](#-like--review)

---

## 📂 Project Structure

| Directory | Description |
| :--- | :--- |
| `modules/commands/` | Bot Logic (AI, Media, Fun, Utility, Admin commands) |
| `modules/core/` | System Core (Database, Cache & Queue Managers) |
| `modules/middleware/` | Security (Rate limiting & Input Validation) |
| `modules/utils/` | Utilities (Helper functions and tools) |
| `page/src/` | Interface (Facebook API Wrappers) |
| `config/` | Configuration (API Endpoints & Constants) |
| `index.js` | Entry Point (Main Application File) |
| `webhook.js` | Webhook Handler (Facebook Messenger webhook processing) |

---

## 🛠️ Setup

### Requirements
- **Node.js** >= 16.0.0
- **MongoDB** (optional but recommended)

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Start: `npm start` or `npm run dev` for development

### Available Scripts
- `npm start` - Production mode
- `npm run dev` - Development with nodemon
- `npm test` - Run tests
- `npm run lint` - Check code style
- `npm run lint:fix` - Fix code style issues
- `npm run format` - Format code with Prettier
- `npm run health` - Check application health
- `npm run logs` - View application logs

### Code Style
- Use 4 spaces for indentation
- Single quotes for strings
- No trailing semicolons
- No inline comments
- Human-readable variable names

### Environment Variables
```env
# Required
PAGE_ACCESS_TOKEN=your_token
VERIFY_TOKEN=your_verify_token
ADMINS=your_facebook_id

# Database
MONGODB_URI=your_mongodb_uri

# AI Services
OPENAI_API_KEY=your_openai_key
CHIPP_API_KEY=your_chipp_key
CHIPP_MODEL=gpt-4

# Redis (for high-load deployments)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# External APIs
DICT_API_KEY=your_dict_key
GOOGLE_API_KEY=your_google_key
GOOGLE_CX=your_google_cx
NASA_API_KEY=your_nasa_key
WOLFRAM_APP_ID=your_wolfram_id
APY_TOKEN=your_apy_token

# Server Configuration
NODE_ENV=production
PORT=8080
BOT_NAME=Amdusbot
APP_SECRET=your_app_secret
LOG_LEVEL=info
```

---

## 🚀 Deployment

```bash
npm install
node index.js
```

**3. Set up Facebook Webhook**
- Point your webhook to `https://your-domain.com/webhook`
- Subscribe to `messages` and `messaging_postbacks`

---

## 🤖 Commands

### 🧠 Artificial Intelligence
- `amdus` — Main AI engine with image analysis
- `gemini` — Google Gemini integration
- `copilot` — Microsoft Copilot with web search
- `perplexity` — Deep reasoning AI
- `venice` — Precise AI model
- `webpilot` — Web search AI assistant
- `you` — You.com AI search
- `sim` — SimSimi chatbot

### 🎬 Media Tools
- `alldl` — Universal media downloader
- `pinterest` — Image search
- `screenshot` — Website preview capture
- `dalle` — AI image generation
- `gmage` — Google image search
- `lyrics` — Song lyrics fetcher
- `nasa` — NASA space photo of the day

### 🛠️ Utilities
- `tempmail` — Disposable email generator
- `remind` — Scheduled reminders
- `trans` — Text translation with audio
- `dict` — Dictionary and slang definitions
- `google` — Google web search
- `wiki` — Wikipedia search
- `wolfram` — Computational knowledge
- `pokemon` — Pokédex lookup
- `joke` — Random jokes
- `48laws` — 48 Laws of Power

### 🛡️ Administration
- `stats` — System metrics
- `getuser` — User database management
- `ban/unban` — User access control
- `broadcast` — Global announcements
- `maintenance` — Toggle maintenance mode
- `cmd` — Enable/disable commands

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

## 👍 Like & Review

If you find this project useful, please star the repository and follow the [Facebook page](https://www.facebook.com/profile.php?id=61585331824038).

<div align="center">
  <br>
  Open-source and maintained by Sethdico.
</div>
