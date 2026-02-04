# Code Execution Backend

A Node.js backend API for executing code in Python, C, C++, and Java using the Piston API.

## Features

- Execute code in multiple languages: Python, C, C++, Java
- RESTful API endpoints
- Built with Express.js
- Easy to deploy
- CORS enabled
- Security headers with Helmet
- Error handling

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone or navigate to the project directory:
```bash
cd "c:\Users\cheta\compiler from scratch"
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (optional):
   - The `.env` file is already created with default values
   - Modify if needed (default port is 3000)

## Running the Server

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`)

## API Endpoints

### 1. Health Check
```
GET /
```

**Response:**
```json
{
  "message": "Code Execution API is running",
  "version": "1.0.0",
  "endpoints": {
    "execute": "POST /api/execute",
    "runtimes": "GET /api/runtimes"
  }
}
```

### 2. Get Available Runtimes
```
GET /api/runtimes
```

**Response:**
```json
{
  "success": true,
  "runtimes": [...]
}
```

### 3. Execute Code
```
POST /api/execute
```

**Request Body:**
```json
{
  "language": "python",
  "code": "print('Hello, World!')",
  "stdin": "",
  "args": []
}
```

**Supported Languages:**
- `python` - Python 3.10.0
- `c` - C (GCC 10.2.0)
- `cpp` - C++ (GCC 10.2.0)
- `java` - Java 15.0.2

**Response (Success):**
```json
{
  "success": true,
  "language": "python",
  "version": "3.10.0",
  "output": {
    "stdout": "Hello, World!\n",
    "stderr": "",
    "output": "Hello, World!\n",
    "code": 0
  },
  "compile": null
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Example Usage

### Python Example:
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "print(\"Hello, World!\")"
  }'
```

### C Example:
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "c",
    "code": "#include <stdio.h>\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}"
  }'
```

### C++ Example:
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "cpp",
    "code": "#include <iostream>\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}"
  }'
```

### Java Example:
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "java",
    "code": "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}"
  }'
```

## Deployment

### Deploy to Heroku

1. Install Heroku CLI
2. Login to Heroku:
```bash
heroku login
```

3. Create a new Heroku app:
```bash
heroku create your-app-name
```

4. Deploy:
```bash
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

### Deploy to Railway

1. Install Railway CLI or use the web interface
2. Run:
```bash
railway init
railway up
```

### Deploy to Render

1. Create a new Web Service on Render
2. Connect your repository
3. Set the following:
   - Build Command: `npm install`
   - Start Command: `npm start`

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

### Deploy to DigitalOcean App Platform

1. Push your code to GitHub
2. Create a new App in DigitalOcean
3. Connect your repository
4. Configure:
   - Build Command: `npm install`
   - Run Command: `npm start`

## Environment Variables for Deployment

Set these environment variables on your deployment platform:

- `PORT` - Port number (usually set automatically)
- `NODE_ENV` - Set to `production`
- `PISTON_API_URL` - (Optional) Default: `https://emkc.org/api/v2/piston`

## Security Considerations

- Rate limiting is not implemented - consider adding it for production
- Input validation is basic - enhance as needed
- Consider adding authentication for production use
- The API accepts code from clients - ensure proper security measures

## License

ISC
