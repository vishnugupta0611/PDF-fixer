# PDF MCQ Processor

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

A robust Node.js backend service that processes PDF files containing multiple-choice questions (MCQs), extracts them using AI, and generates a formatted PDF output with the questions and their correct answers.

[Features](#-features) • [Installation](#-installation) • [API Documentation](#-api-documentation) • [Contributing](#-contributing) • [Support](#-support)

</div>

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Contributing](#-contributing)
- [Security](#-security)
- [License](#-license)
- [Support](#-support)

## 🌟 Overview

The PDF MCQ Processor is a powerful backend service designed to automate the extraction and formatting of multiple-choice questions from PDF documents. It leverages advanced technologies including:

- PDF text extraction and OCR
- Google's Gemini AI for intelligent MCQ processing
- Automated correct answer identification
- Professional PDF output generation

## ✨ Features

### Core Functionality
- **PDF Processing**
  - Text extraction from various PDF formats
  - OCR support for scanned documents
  - Automatic text cleaning and formatting
  - Support for multiple PDF layouts

- **AI Integration**
  - Powered by Google's Gemini AI
  - Intelligent MCQ detection and parsing
  - Automatic correct answer identification
  - Context-aware question processing

- **Output Generation**
  - Clean, formatted PDF output
  - Consistent question numbering
  - Highlighted correct answers
  - Professional document layout

### Technical Features
- RESTful API endpoints
- CORS enabled for cross-origin requests
- File upload handling with size limits
- Health check monitoring
- Comprehensive error handling
- Automatic resource cleanup

## 🏗 Architecture

The service follows a modular architecture:

```
pdf-mcq-processor/
├── index.js           # Main application file
├── .env              # Environment variables
├── package.json      # Project dependencies
├── output/          # Generated PDFs directory
└── temp/            # Temporary files directory
```

### Technology Stack
- **Backend**: Node.js with Express
- **PDF Processing**: pdf-parse, pdfkit
- **OCR**: Tesseract.js
- **AI**: Google Gemini AI
- **File Handling**: express-fileupload
- **Image Processing**: sharp

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
  ```bash
  node --version  # Should be >= 14.0.0
  ```
- npm (v6 or higher) or yarn
  ```bash
  npm --version   # Should be >= 6.0.0
  # or
  yarn --version  # Should be >= 1.22.0
  ```
- Google Gemini API key
  - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### System Requirements
- Minimum 2GB RAM
- 500MB free disk space
- Stable internet connection for AI processing

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pdf-mcq-processor.git
   cd pdf-mcq-processor
   ```

2. **Install dependencies**
   ```bash
   # Using npm
   npm install

   # Using yarn
   yarn install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   ```env
   # Required
   GEMINI_API_KEY=your_gemini_api_key_here

   # Optional (defaults shown)
   PORT=3000
   MAX_FILE_SIZE=10485760  # 10MB in bytes
   TEMP_DIR=/tmp
   OUTPUT_DIR=./output
   ```

5. **Create required directories**
   ```bash
   mkdir -p output temp
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| GEMINI_API_KEY | Google Gemini API key | - | Yes |
| PORT | Server port | 3000 | No |
| MAX_FILE_SIZE | Maximum file size in bytes | 10485760 | No |
| TEMP_DIR | Temporary files directory | /tmp | No |
| OUTPUT_DIR | Output PDF directory | ./output | No |

### Running the Application

**Development mode with hot reload:**
```bash
# Using npm
npm run dev

# Using yarn
yarn dev
```

**Production mode:**
```bash
# Using npm
npm start

# Using yarn
yarn start
```

The server will start on port 3000 (or the port specified in your .env file).

## 📚 API Documentation

### Endpoints

#### 1. Process PDF
- **URL**: `/process-pdf`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body**: 
  - `pdf`: PDF file containing MCQs (max 10MB)

**Request Example:**
```bash
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "pdf=@/path/to/your/questions.pdf" \
  http://localhost:3000/process-pdf
```

**Success Response:**
- Content-Type: `application/pdf`
- Headers:
  ```
  Content-Disposition: attachment; filename="questions_processed_1234567890.pdf"
  Content-Length: <file_size>
  ```
- Body: PDF file with processed MCQs

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

#### 2. Health Check
- **URL**: `/health`
- **Method**: `GET`
- **Response**: 
  ```json
  {
    "status": "OK",
    "timestamp": "2024-03-14T12:00:00.000Z",
    "version": "1.0.0",
    "uptime": "2h 30m"
  }
  ```

#### 3. Root Endpoint
- **URL**: `/`
- **Method**: `GET`
- **Response**: 
  ```json
  {
    "message": "PDF MCQ Processor API",
    "status": "Running",
    "version": "1.0.0",
    "endpoints": {
      "POST /process-pdf": "Process PDF and extract MCQs",
      "GET /health": "Health check",
      "GET /": "API information"
    }
  }
  ```

## 💻 Development

### Project Structure
```
pdf-mcq-processor/
├── index.js           # Main application file
├── .env              # Environment variables
├── package.json      # Project dependencies
├── package-lock.json # Dependency lock file
├── output/          # Generated PDFs directory
├── temp/            # Temporary files directory
└── README.md        # Project documentation
```

### Development Workflow
1. Create a new branch for your feature
2. Make your changes
3. Run tests
4. Submit a pull request

### Code Style
- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for functions
- Keep functions small and focused

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Add comments for complex logic
- Write meaningful commit messages
- Update documentation for new features
- Add tests for new functionality
- Follow semantic versioning
- Update CHANGELOG.md for significant changes

### Pull Request Process
1. Update the README.md with details of changes
2. Update the documentation if needed
3. The PR will be merged once you have the sign-off of at least one maintainer

## 🔒 Security

### Best Practices
- Never commit API keys or sensitive information
- Use environment variables for configuration
- Keep dependencies updated
- Report security vulnerabilities to maintainers
- Follow security best practices
- Regular security audits
- Input validation and sanitization
- Rate limiting implementation

### Reporting Vulnerabilities
Please report security vulnerabilities to security@yourdomain.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

### Getting Help
1. Check the [FAQ](FAQ.md)
2. Search existing [issues](https://github.com/yourusername/pdf-mcq-processor/issues)
3. Open a new issue if needed
4. Contact maintainers for urgent matters

### Community
- [Discord Server](https://discord.gg/your-server)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/pdf-mcq-processor)
- [Twitter](https://twitter.com/your-handle)

---

<div align="center">
Made with ❤️ by the PDF MCQ Processor team

[Report Bug](https://github.com/yourusername/pdf-mcq-processor/issues) • [Request Feature](https://github.com/yourusername/pdf-mcq-processor/issues)
</div> 
