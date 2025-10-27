# ❄️ Frost & Freeze Alert System

A complete web application that checks for frost and freeze advisories in any U.S. location via ZIP code, with automated daily email alerts at 8:00 AM EST.

## ✨ Features

- 🔍 **Instant Alert Checking** - Check for frost/freeze advisories by ZIP code
- 📧 **Daily Email Notifications** - Automated emails every morning at 8am EST
- 💬 **Plain English Summaries** - Technical weather data translated to actionable advice
- 🎨 **Modern UI** - Clean, responsive interface that works on all devices
- 🔒 **Secure & Private** - No data tracking, minimal data storage

## 📋 Requirements

- **Node.js** 14.x or higher
- **npm** 6.x or higher
- **Gmail account** (for sending emails) or other SMTP service

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Email Settings

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your email credentials:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
PORT=3000
```

**Important for Gmail Users:**
- You need to use an "App Password" (not your regular Gmail password)
- Enable 2-Factor Authentication on your Google account
- Generate an App Password: https://myaccount.google.com/apppasswords
- Select "Mail" and your device, then copy the 16-character password

### 3. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 4. Open the Front-End

Open `frost-freeze-frontend.html` in your web browser, or serve it using:

```bash
# Using Python 3
python3 -m http.server 8000

# Or using Node.js http-server
npx http-server -p 8000
```

Then navigate to `http://localhost:8000/frost-freeze-frontend.html`

## 📁 Project Structure

```
frost-freeze-alert/
├── server.js                    # Backend API server
├── package.json                 # Node.js dependencies
├── .env                         # Environment variables (create this)
├── .env.example                 # Example environment variables
├── subscriptions.db             # SQLite database (auto-created)
├── frost-freeze-frontend.html   # Front-end application
└── README.md                    # This file
```

## 🔧 Configuration

### Email Service Options

#### Gmail (Recommended for testing)
```javascript
service: 'gmail',
auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
}
```

#### SendGrid (Recommended for production)
```javascript
host: 'smtp.sendgrid.net',
port: 587,
auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
}
```

#### Other SMTP Services
- **Mailgun**: smtp.mailgun.org
- **Amazon SES**: email-smtp.us-east-1.amazonaws.com
- **Outlook**: smtp-mail.outlook.com

### Cron Schedule

The default schedule is **8:00 AM EST daily**. To change:

Edit `server.js` line ~470:
```javascript
// Current: 8:00 AM EST
cron.schedule('0 8 * * *', () => {
    sendDailyAlerts();
}, {
    timezone: 'America/New_York'
});

// Examples:
// 7:00 AM: '0 7 * * *'
// 6:30 AM: '30 6 * * *'
// Twice daily (8am & 8pm): '0 8,20 * * *'
```

## 🌐 Deployment Options

### Option 1: Heroku (Easiest)

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Create a new app:
```bash
heroku create your-app-name
```
3. Set environment variables:
```bash
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASSWORD=your-app-password
```
4. Deploy:
```bash
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

### Option 2: DigitalOcean App Platform

1. Push code to GitHub
2. Connect to DigitalOcean App Platform
3. Set environment variables in the dashboard
4. Deploy automatically

### Option 3: AWS EC2

1. Launch an EC2 instance (Ubuntu 20.04 recommended)
2. SSH into instance
3. Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```
4. Clone/upload your code
5. Install dependencies: `npm install`
6. Use PM2 for process management:
```bash
sudo npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save
```

### Option 4: Vercel (Serverless)

Note: Cron jobs work differently on serverless. You'll need to use Vercel Cron:

1. Install Vercel CLI: `npm i -g vercel`
2. Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/send-alerts",
    "schedule": "0 8 * * *"
  }]
}
```
3. Deploy: `vercel`

## 📧 Testing Email Functionality

### Manual Test

```bash
curl -X POST http://localhost:3000/api/send-alerts-now
```

This will immediately send alerts to all subscribed users.

### Test Subscription

1. Open the front-end in your browser
2. Enter a ZIP code (e.g., 60601 for Chicago)
3. Click "Check for Alerts"
4. Enter your email and click "Subscribe"
5. Trigger manual send (see above)
6. Check your inbox

## 🐛 Troubleshooting

### "Authentication failed" Email Error

**Problem**: Gmail blocking login attempts

**Solutions**:
1. Use an App Password (not your regular password)
2. Enable 2-Factor Authentication first
3. Generate App Password: https://myaccount.google.com/apppasswords
4. Use less secure app access (not recommended): https://myaccount.google.com/lesssecureapps

### "Invalid ZIP code" Error

**Problem**: ZIP code API timeout or invalid code

**Solutions**:
1. Verify ZIP code is 5 digits
2. Check internet connection
3. Try a different ZIP code
4. The API (zippopotam.us) might be temporarily down

### Cron Job Not Running

**Problem**: Daily emails not being sent

**Solutions**:
1. Verify server is running 24/7
2. Check server timezone: `date` in terminal
3. Check logs for errors
4. Test manually: `curl -X POST http://localhost:3000/api/send-alerts-now`
5. Ensure cron timezone matches your desired timezone

### Database Errors

**Problem**: SQLite errors on startup

**Solutions**:
1. Delete `subscriptions.db` and restart
2. Check file permissions: `chmod 644 subscriptions.db`
3. Ensure write permissions in directory

## 🔒 Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use environment variables** for all secrets
3. **Limit email rate** - Current: 1 email/second
4. **Validate inputs** - ZIP codes and email addresses
5. **Use HTTPS** in production
6. **Implement unsubscribe** - Email link or API endpoint
7. **Add CAPTCHA** if abuse occurs
8. **Monitor logs** for suspicious activity

## 📊 Database Schema

```sql
CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    zip_code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_sent DATETIME,
    active INTEGER DEFAULT 1
);
```

## 🎯 API Endpoints

### `POST /api/subscribe`
Subscribe to daily alerts
```json
{
  "email": "user@example.com",
  "zipCode": "60601"
}
```

### `POST /api/unsubscribe`
Unsubscribe from alerts
```json
{
  "email": "user@example.com"
}
```

### `POST /api/send-alerts-now`
Manually trigger alert send (for testing)

### `GET /api/health`
Health check endpoint

## 🔄 Updating the Frontend API URL

After deploying the backend, update the API URL in `frost-freeze-frontend.html`:

```javascript
// Line ~12
const API_BASE_URL = 'https://your-deployed-backend.com/api';
```

## 📝 Customization

### Change Email Template

Edit the `generateEmailHTML()` function in `server.js` (starting around line ~350)

### Add More Alert Types

Edit `FROST_FREEZE_KEYWORDS` array in both files:
```javascript
const FROST_FREEZE_KEYWORDS = [
    'frost', 'freeze', 'freezing', 
    'hard freeze', 'killing frost',
    'wind chill',  // Add more keywords
    'ice'
];
```

### Modify Plain English Translations

Edit `generatePlainEnglish()` function in `server.js` (line ~280)

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - feel free to use for personal or commercial projects

## 🆘 Support

For issues or questions:
- Check the troubleshooting section above
- Review server logs: `tail -f server.log`
- Test API endpoints with curl or Postman

## 🎉 Credits

- Weather data: National Weather Service (NWS) API
- ZIP code geocoding: Zippopotam.us
- Built with Node.js, Express, and vanilla JavaScript
