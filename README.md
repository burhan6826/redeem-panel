# Web-Based Redeem Panel with Discord Bot Integration

A complete web-based redeem panel system with Discord bot integration for processing and managing redeem requests.

## Features

### 🌐 Web Panel
- **Clean, Responsive Design**: Modern UI with gradient backgrounds and smooth animations
- **Form Validation**: Real-time client-side validation with helpful error messages
- **User-Friendly**: Simple 3-field form (Name, Redeem Key, Discord Invite Link)
- **Success Feedback**: Clear confirmation message after submission
- **Rate Limiting**: Protection against spam and abuse

### 🤖 Discord Bot
- **Real-time Notifications**: Instant alerts for new redeem requests
- **Admin Controls**: Approve/Reject buttons for easy request management
- **Status Updates**: Automatic message updates when requests are processed
- **Detailed Logging**: Complete audit trail with timestamps and IP addresses

### 🔧 Backend API
- **RESTful API**: Clean endpoints for redeem request management
- **Database Storage**: SQLite database for persistent data storage
- **Input Validation**: Comprehensive server-side validation
- **Security**: Rate limiting, CORS protection, and security headers
- **Duplicate Prevention**: One-time use redeem keys

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   Express API   │    │  Discord Bot    │
│   (HTML/JS)     │◄──►│   (Node.js)     │◄──►│  (discord.js)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  SQLite Database│
                       │   (redeem.db)   │
                       └─────────────────┘
```

## Requirements

- Node.js 16.11.0 or higher
- Discord Bot Token
- Discord Application Credentials
- SQLite3 (included with Node.js)

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_PATH=./data/redeem.db

# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
REDEEM_LOGS_CHANNEL_ID=your_redeem_logs_channel_id_here

# Redeem Configuration
REDEEM_EMAIL=burhanw997@gmail.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 3. Get Discord Bot Credentials

1. **Create Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name

2. **Create Bot**:
   - Go to "Bot" tab → "Add Bot"
   - Enable necessary intents
   - Copy bot token to `DISCORD_TOKEN`

3. **Get IDs**:
   - `CLIENT_ID`: From "General Information" tab
   - `GUILD_ID`: Right-click server in Discord (enable Developer Mode)
   - `REDEEM_LOGS_CHANNEL_ID`: Create a private channel and right-click to copy ID

4. **Invite Bot**:
   - Go to OAuth2 → URL Generator
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: Send Messages, Embed Links, Use External Emojis

### 4. Start the Services

**Start the Web Server:**
```bash
npm start
# or for development:
npm run dev
```

**Start the Discord Bot (in separate terminal):**
```bash
npm run bot
# or for development:
npm run dev-bot
```

### 5. Access the Application

- **Web Panel**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/health
- **API Documentation**: See endpoints below

## API Endpoints

### POST /api/redeem
Submit a new redeem request.

**Request Body:**
```json
{
  "name": "Client Name",
  "redeemKey": "ABC-123-XYZ",
  "inviteLink": "https://discord.gg/example"
}
```

**Response:**
```json
{
  "success": true,
  "message": "✅ Your request has been received. Please wait while we process your order.",
  "requestId": 123
}
```

### GET /api/requests
Get all redeem requests (admin use).

### GET /api/requests/pending
Get only pending requests.

### PUT /api/requests/:id/status
Update request status (admin use).

**Request Body:**
```json
{
  "status": "APPROVED" // or "REJECTED"
}
```

### GET /api/health
Health check endpoint.

## Database Schema

### redeem_requests table
- `id` (INTEGER PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `redeemKey` (TEXT UNIQUE NOT NULL)
- `inviteLink` (TEXT NOT NULL)
- `email` (TEXT NOT NULL) - Hard-coded as burhanw997@gmail.com
- `status` (TEXT NOT NULL) - PENDING, APPROVED, REJECTED
- `timestamp` (DATETIME)
- `ipAddress` (TEXT)
- `userAgent` (TEXT)

### used_keys table
- `id` (INTEGER PRIMARY KEY)
- `redeemKey` (TEXT UNIQUE NOT NULL)
- `usedAt` (DATETIME)

## Security Features

- **Rate Limiting**: 5 requests per 15 minutes per IP
- **Input Validation**: Comprehensive server-side validation
- **CORS Protection**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js for additional security
- **Duplicate Prevention**: One-time use redeem keys
- **IP Tracking**: Records IP addresses for audit trail

## Discord Bot Features

### Admin Controls
- **Approve Button**: Marks request as APPROVED
- **Reject Button**: Marks request as REJECTED
- **Status Updates**: Messages update automatically when status changes
- **Detailed Information**: Shows all request details in embed format

### Automatic Notifications
- **Real-time Updates**: Checks for new requests every 30 seconds
- **Rich Embeds**: Beautiful formatted messages with all details
- **Button Interactions**: Easy approval/rejection with confirmation
- **Error Handling**: Graceful handling of errors and edge cases

## Project Structure

```
web-redeem-panel/
├── server/
│   ├── index.js           # Express server and API endpoints
│   └── database.js        # SQLite database operations
├── bot/
│   ├── index.js           # Discord bot main file
│   └── deploy-commands.js # Command deployment (minimal)
├── public/
│   └── index.html         # Frontend web panel
├── data/                  # Auto-created database directory
│   └── redeem.db          # SQLite database
├── package.json           # Dependencies and scripts
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore file
└── README.md              # This file
```

## Development Scripts

```bash
# Start web server
npm start

# Start web server with auto-reload
npm run dev

# Start Discord bot
npm run bot

# Start Discord bot with auto-reload
npm run dev-bot

# Deploy Discord commands (minimal)
npm run deploy-commands
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `DATABASE_PATH` | SQLite database file path | ./data/redeem.db |
| `DISCORD_TOKEN` | Discord bot token | Required |
| `CLIENT_ID` | Discord application ID | Required |
| `GUILD_ID` | Discord server ID | Required |
| `REDEEM_LOGS_CHANNEL_ID` | Admin logs channel ID | Required |
| `REDEEM_EMAIL` | Hard-coded email | burhanw997@gmail.com |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 5 |
| `FRONTEND_URL` | CORS allowed origin | http://localhost:3000 |

## Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use a proper database path with persistence
3. Configure reverse proxy (nginx/Apache)
4. Set up SSL certificates
5. Configure environment variables properly

### Security Considerations
- Use environment variables for sensitive data
- Implement proper logging and monitoring
- Set up database backups
- Configure firewall rules
- Use HTTPS in production

## Troubleshooting

### Common Issues

1. **Bot not responding**: Check token and permissions
2. **Database errors**: Ensure write permissions for data directory
3. **CORS errors**: Verify FRONTEND_URL configuration
4. **Rate limiting**: Check IP and timing settings
5. **Discord notifications**: Verify channel ID and bot permissions

### Logs and Debugging

- Server logs show API requests and errors
- Bot logs show Discord interactions
- Database operations are logged
- Check browser console for frontend issues

## License

MIT License - feel free to use and modify for your projects.
#   R e s t a r t   t r i g g e r  
 