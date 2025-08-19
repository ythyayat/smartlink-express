# SmartLink Express

[![License](https://img.shields.io/badge/license-ISC-blue)](https://opensource.org/licenses/ISC)

A dynamic link shortening service for deeplinks built with Node.js and Express.

## 🚀 Features

- **Custom Short URLs**: Create memorable links with optional custom slugs
- **Platform Analytics**: Track clicks by iOS, Android, and other platforms
- **Rate Limiting**: Redis-powered rate control for API endpoints
- **API Key Authentication**: Secure endpoint access with `x-api-key` header
- **Mobile Detection**: Automatic redirection based on device type
- **Docker Support**: Container-ready with Dockerfile and .dockerignore
- **Health Check**: `/health` endpoint for container orchestration

## 🛠️ Tech Stack

- Express 5.x
- MySQL for persistent storage (via Sequelize ORM)
- Redis for rate limiting
- EJS templating engine
- dotenv for environment variables
- nanoid for slug generation
- express-rate-limit for request throttling

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/ythyayat/smartlink-express.git

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials and Redis URL
```

## ▶️ Usage

### Development
```bash
node server.js
```

### Docker Build
```bash
npm run docker:build
```

### Docker Start
```bash
npm run docker:start
```

### API Usage

**Create Short Link**
```bash
curl -X POST http://localhost:3000/api/links \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "example.com",
    "slug": "custom-slug",
    "title": "Example Link",
    "description": "SmartLink to example.com",
    "image_url": "https://example.com/preview.jpg"
  }'
```

**Get Link Analytics**
```bash
curl http://localhost:3000/api/links/custom-slug/stats \
  -H "x-api-key: your-api-key"
```

**Health Check**
```bash
curl http://localhost:3000/health
```

## 🧪 Docker Deployment

```bash
# Build image
docker build -t smartlink:latest .

# Run container
docker run -d \
  --name smartlink-container \
  --restart unless-stopped \
  --read-only \
  --tmpfs /tmp \
  --env-file .env \
  -p 3000:3000 \
  smartlink:latest
```

## 📄 Configuration

Required environment variables in `.env`:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=smartlink
DB_USER=root
DB_PASS=yourpassword
REDIS_URL=redis://localhost:6379
API_KEY=your-secret-api-key
FALLBACK_URL_DEFAULT_IOS=https://apps.apple.com/app/id123456789
FALLBACK_URL_DEFAULT_ANDROID=https://play.google.com/store/apps/details?id=com.example.app
REDIRECT_URL_DEFAULT=https://example.com
```

## 📁 Project Structure

```
├── views/
│   ├── link.ejs          # Link rendering template
│   └── not-found.ejs     # 404 fallback template
├── server.js             # Express server implementation
├── db.js                 # MySQL model definition
├── Dockerfile            # Container configuration
├── .env.example          # Configuration template
└── public/               # Static assets directory
```

## 🔗 API Documentation

### Create Link
```bash
POST /api/links
x-api-key: your-api-key
{
  "path": "example.com",
  "slug": "custom-slug",  # Optional
  "title": "Example Link",
  "description": "SmartLink to example.com",
  "image_url": "https://example.com/preview.jpg"
}
```

### Get Analytics
```bash
GET /api/links/:slug/stats
x-api-key: your-api-key
{
  "slug": "custom-slug",
  "click_count": 15,
  "platform": {
    "ios": 5,
    "android": 7,
    "other": 3
  }
}
```

### Health Check
```bash
GET /health
{
  "status": "ok",
  "version": "1.0.0"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request with detailed changes

## 📜 License

ISC License - see [LICENSE](LICENSE) for details