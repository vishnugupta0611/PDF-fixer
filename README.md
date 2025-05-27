# PDF MCQ Processor

A robust Node.js backend service that processes PDF files containing multiple-choice questions (MCQs), extracts them using AI, and generates a formatted PDF output with the questions and their correct answers. This service is particularly useful for educators, content creators, and anyone who needs to process and format multiple-choice questions from PDF documents.

## 🌟 Features

- **PDF Processing**
  - Text extraction from PDF files
  - OCR capabilities for scanned documents
  - Support for various PDF formats and layouts
  - Automatic text cleaning and formatting

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

- **API Features**
  - RESTful API endpoints
  - CORS enabled for cross-origin requests
  - File upload handling with size limits
  - Health check monitoring
  - Error handling and validation

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
  - Check version: `node --version`
  - Download from: [Node.js Official Website](https://nodejs.org/)
- npm (v6 or higher) or yarn
  - Check npm version: `npm --version`
  - Check yarn version: `yarn --version`
- Google Gemini API key
  - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Minimum 2GB RAM recommended
- 500MB free disk space

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pdf-mcq-processor.git
cd pdf-mcq-processor
```

2. Install dependencies:
```bash
# Using npm
npm install

# Using yarn
yarn install
```

3. Create a `.env` file in the root directory:
```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional (defaults shown)
PORT=3000
MAX_FILE_SIZE=10485760  # 10MB in bytes
TEMP_DIR=/tmp
OUTPUT_DIR=./output
```

4. Create required directories:
```bash
mkdir -p output temp
```

### Running the Application

Development mode with hot reload:
```bash
# Using npm
npm run dev

# Using yarn
yarn dev
```

Production mode:
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

**Request Example**:
```bash
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "pdf=@/path/to/your/questions.pdf" \
  http://localhost:3000/process-pdf
```

**Success Response**:
- Content-Type: `application/pdf`
- Headers:
  ```
  Content-Disposition: attachment; filename="questions_processed_1234567890.pdf"
  Content-Length: <file_size>
  ```
- Body: PDF file with processed MCQs

**Error Response**:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

Common Error Codes:
- `400`: Bad Request (invalid file, missing file)
- `413`: Payload Too Large (file too big)
- `415`: Unsupported Media Type (non-PDF file)
- `500`: Internal Server Error

#### 2. Health Check
- **URL**: `/health`
- **Method**: `GET`

**Response**:
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

**Response**:
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

## 🛠️ Technical Details

### Dependencies

- `express` (^4.18.2): Web framework
- `cors` (^2.8.5): Cross-origin resource sharing
- `express-fileupload` (^1.4.0): File upload handling
- `pdf-parse` (^1.1.1): PDF text extraction
- `tesseract.js` (^5.0.0): OCR capabilities
- `@google/generative-ai` (^0.1.0): Google's Gemini AI integration
- `pdfkit` (^0.14.0): PDF generation
- `json5` (^2.2.3): JSON parsing
- `sharp` (^0.33.0): Image processing
- `dotenv` (^16.3.1): Environment variable management

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

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| GEMINI_API_KEY | Google Gemini API key | - | Yes |
| PORT | Server port | 3000 | No |
| MAX_FILE_SIZE | Maximum file size in bytes | 10485760 | No |
| TEMP_DIR | Temporary files directory | /tmp | No |
| OUTPUT_DIR | Output PDF directory | ./output | No |

## 🔍 Troubleshooting

### Common Issues

1. **File Upload Fails**
   - Check file size (max 10MB)
   - Ensure file is PDF format
   - Verify file permissions

2. **OCR Not Working**
   - Ensure Tesseract.js is properly installed
   - Check image quality in PDF
   - Verify system memory availability

3. **API Key Issues**
   - Verify GEMINI_API_KEY in .env
   - Check API key validity
   - Ensure proper API key format

4. **Memory Issues**
   - Increase Node.js memory limit:
     ```bash
     export NODE_OPTIONS="--max-old-space-size=4096"
     ```
   - Monitor system memory usage
   - Clean up temporary files

### Logging

Enable debug logging by setting:
```bash
export DEBUG=pdf-mcq-processor:*
```

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

### Code Style

- Use ESLint for code linting
- Follow Airbnb JavaScript Style Guide
- Use meaningful variable names
- Add JSDoc comments for functions
- Keep functions small and focused

## 📝 Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) to keep our community approachable and respectable.

## 🔒 Security

- Never commit API keys or sensitive information
- Use environment variables for configuration
- Keep dependencies updated
- Report security vulnerabilities to maintainers
- Follow security best practices
- Regular security audits
- Input validation and sanitization
- Rate limiting implementation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for MCQ processing
- All contributors who have helped shape this project
- Open source community for various dependencies
- PDF processing community for insights and tools

## 📞 Support

For support, please:
1. Check the [FAQ](FAQ.md)
2. Search existing [issues](https://github.com/yourusername/pdf-mcq-processor/issues)
3. Open a new issue if needed
4. Contact maintainers for urgent matters

### Community

- [Discord Server](https://discord.gg/your-server)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/pdf-mcq-processor)
- [Twitter](https://twitter.com/your-handle)

---

Made with ❤️ by the PDF MCQ Processor team 
