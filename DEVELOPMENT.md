# Development Guide

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Start development server: `npm run dev`

## Available Scripts

- `npm start` - Production mode
- `npm run dev` - Development with nodemon
- `npm test` - Run tests
- `npm run lint` - Check code style
- `npm run lint:fix` - Fix code style issues
- `npm run format` - Format code with Prettier
- `npm run health` - Check application health
- `npm run logs` - View application logs

## Code Style

- Use 4 spaces for indentation
- Single quotes for strings
- No trailing semicolons
- No inline comments
- Human-readable variable names

## Project Structure

```
modules/
├── commands/          # Bot commands
├── core/              # Core functionality
├── middleware/        # Express middleware
└── utils/             # Utility functions

config/                 # Configuration files
logs/                   # Application logs
cache/                  # Cache storage
tests/                  # Test files
```

## Environment Variables

Required:
- `PAGE_ACCESS_TOKEN` - Facebook Page access token
- `VERIFY_TOKEN` - Webhook verification token
- `ADMIN_ID` - Admin user IDs (comma-separated)

Optional:
- `MONGODB_URI` - MongoDB connection string
- `OPENAI_API_KEY` - OpenAI API key
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (error/warn/info/debug)
- `PORT` - Server port (default: 8080)

## Health Checks

- GET `/health` - Application health status
- GET `/` - Basic status with command count

## Logging

Structured logging with Winston:
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Console output in development

## Testing

Run tests with Jest:
```bash
npm test
```

## Deployment

1. Set environment variables
2. Install dependencies: `npm install --production`
3. Start application: `npm start`

## Security

- Helmet.js for security headers
- Rate limiting
- Input validation
- Webhook signature verification
- CORS protection
