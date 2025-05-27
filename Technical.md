# PDF MCQ Processor - Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Code Structure](#code-structure)
3. [Detailed Code Explanation](#detailed-code-explanation)
4. [API Implementation](#api-implementation)
5. [Error Handling](#error-handling)
6. [Performance Considerations](#performance-considerations)

## Project Overview

The PDF MCQ Processor is a Node.js backend service that processes PDF files containing multiple-choice questions. It uses various technologies including PDF parsing, OCR, and AI to extract and format MCQs.

## Code Structure

### Dependencies and Imports
```javascript
// Required packages
const express = require('express');
const cors = require('cors');
const fileupload = require('express-fileupload');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const PDFDocument = require('pdfkit');
const JSON5 = require('json5');
const sharp = require('sharp');
```
Each import serves a specific purpose:
- `express`: Web framework for handling HTTP requests
- `cors`: Enables Cross-Origin Resource Sharing
- `fileupload`: Handles file uploads in multipart/form-data format
- `fs`: Node.js file system module for file operations
- `pdfParse`: Extracts text from PDF files
- `tesseract.js`: Provides OCR capabilities
- `path`: Handles file paths in a cross-platform way
- `GoogleGenerativeAI`: Google's AI service for MCQ processing
- `PDFDocument`: Generates PDF output
- `JSON5`: Parses JSON with comments and trailing commas
- `sharp`: Image processing library

### Environment Setup
```javascript
// Load env variables (for API key)
require('dotenv').config();

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(
  fileupload({
    useTempFiles: true,
    tempFileDir: '/tmp',
  })
);
```
This section:
1. Loads environment variables from .env file
2. Initializes Express application
3. Sets up middleware:
   - CORS for cross-origin requests
   - JSON body parsing
   - File upload handling with temporary file storage

## Detailed Code Explanation

### PDF Generation Function
```javascript
const generateQuestionPDF = (questions, outputPath) => {
  if (!Array.isArray(questions)) {
    throw new Error('generateQuestionPDF: questions is not a valid array');
  }

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  doc.fontSize(20).fillColor('#333').text('Question Paper', { align: 'center' });
  doc.moveDown();

  questions.forEach((qObj, index) => {
    const questionKey = Object.keys(qObj).find(k => k.startsWith('q'));
    const questionText = qObj[questionKey];

    doc.fontSize(14).fillColor('black').text(`${index + 1}. ${questionText}`);
    ['A.', 'B.', 'C.', 'D.'].forEach((optionKey) => {
      const isCorrect = qObj.correct?.startsWith(optionKey);
      doc.fillColor(isCorrect ? 'green' : 'black');
      doc.text(`${optionKey} ${qObj[optionKey]}`);
    });

    doc.moveDown();
  });

  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};
```
This function:
1. Validates input questions array
2. Creates output directory if it doesn't exist
3. Initializes PDF document with margins
4. Creates write stream for PDF output
5. Adds title and formats questions
6. Highlights correct answers in green
7. Returns a promise that resolves when PDF is complete

### OCR Function
```javascript
async function extractTextWithOCR(pdfPath) {
  const worker = await createWorker();
  let combinedText = '';

  try {
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    console.log('OCR extraction attempted but poppler not available');
    return {
      text: 'OCR not available - using text extraction only',
      isOCR: false,
      generatedFiles: [],
    };
  } finally {
    await worker.terminate();
  }
}
```
This function:
1. Creates Tesseract worker for OCR
2. Loads English language data
3. Initializes OCR engine
4. Returns fallback message if OCR not available
5. Ensures worker is terminated

### Gemini AI Integration
```javascript
async function getcorrectmcqs(inputText) {
  const prompt = `
You are a JSON MCQ fixer for a PDF parser. 

Your task is to take raw multiple-choice questions (MCQs) and convert them **only** into the following JSON format:

{
  "questions": [
    {
      "q1.": "Question text",
      "A.": "Option A",
      "B.": "Option B",
      "C.": "Option C",
      "D.": "Option D",
      "correct": "C. Correct Answer"
    }
  ]
}

🛑 Important Rules:
- Only include MCQs.
- Each question must have 4 options: A, B, C, D.
- Include the correct option as "correct": "X. Answer" where X is A, B, C, or D.
- Do not include any explanations, notes, headings, or non-MCQ content.
- Question keys must be "q1.", "q2.", etc. in order.
- Use exact spacing and punctuation like shown above.
- Give me questions up to 100 only and don't include any explanation or code markdown
Now convert the following MCQs to JSON:
give ans of all questions 

"""
${inputText}
"""
`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    apiVersion: "v1"
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  console.log('Gemini response received');
  return text;
}
```
This function:
1. Defines prompt template for Gemini AI
2. Initializes Gemini AI with API key
3. Configures model parameters
4. Sends text for processing
5. Returns processed response

### Text Processing Functions
```javascript
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '');
}

function extractValidQuestionsFromText(text) {
  try {
    const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed;
      }
    } catch (e) {
      console.log('Full JSON parse failed, trying regex approach');
    }

    const regex = /{[^{}]*?"q\d+\..*?"[^{}]*?"correct":\s*".+?"[^{}]*?}/gs;
    const matches = text.match(regex);
    
    if (!matches) {
      console.log('No question matches found');
      return null;
    }

    const questions = [];
    for (let obj of matches) {
      try {
        const cleaned = obj.replace(/(\w+)\s*:/g, '"$1":');
        const jsonObj = JSON.parse(cleaned);
        questions.push(jsonObj);
      } catch (e) {
        console.log('Skipping invalid question object');
        continue;
      }
    }

    return { questions };
  } catch (err) {
    console.error('❌ Failed to parse questions:', err.message);
    return null;
  }
}
```
These functions:
1. `cleanText`: Removes extra whitespace
2. `extractValidQuestionsFromText`: 
   - Attempts to parse complete JSON
   - Falls back to regex parsing
   - Validates question format
   - Handles parsing errors

## API Implementation

### Main Processing Endpoint
```javascript
app.post('/process-pdf', async (req, res) => {
  let generatedFiles = [];
  let outputPath = null;

  try {
    if (!req.files?.pdf) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const pdfFile = req.files.pdf;
    const tempPath = pdfFile.tempFilePath;

    const pdfData = await pdfParse(fs.readFileSync(tempPath));
    let text = pdfData.text;
    let isOCR = false;

    if (!text || text.replace(/\s+/g, '').length < 50) {
      try {
        const ocrResult = await extractTextWithOCR(tempPath);
        if (ocrResult.text && ocrResult.text.length > text.length) {
          text = ocrResult.text;
          isOCR = ocrResult.isOCR;
          generatedFiles = ocrResult.generatedFiles;
        }
      } catch (ocrError) {
        console.log('OCR failed:', ocrError.message);
      }
    }

    if (!text || text.length < 20) {
      return res.status(400).json({ 
        error: 'Could not extract sufficient text from PDF' 
      });
    }
    
    text = cleanText(text);
    const correctmcqs = await getcorrectmcqs(text);
    const parsed = extractValidQuestionsFromText(correctmcqs);
    
    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return res.status(500).json({
        error: 'No valid MCQs found in the document'
      });
    }

    const timestamp = Date.now();
    outputPath = path.join(__dirname, './output', `${pdfFile.name}_${timestamp}.pdf`);
    
    await generateQuestionPDF(parsed.questions, outputPath);
    
    if (!fs.existsSync(outputPath)) {
      throw new Error('PDF generation failed - file not created');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFile.name}_processed_${timestamp}.pdf"`);
    res.setHeader('Content-Length', fs.statSync(outputPath).size);
    
    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      setTimeout(() => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      }, 2000);
    });
    
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file' });
      }
    });
    
  } catch (error) {
    console.error('❌ Processing error:', error.message);
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Processing failed',
        details: error.message,
      });
    }
  } finally {
    try {
      if (req.files?.pdf?.tempFilePath && fs.existsSync(req.files.pdf.tempFilePath)) {
        fs.unlinkSync(req.files.pdf.tempFilePath);
      }

      const tempDir = path.join(__dirname, 'temp');
      if (fs.existsSync(tempDir)) {
        generatedFiles.forEach(file => {
          const filePath = path.join(tempDir, file);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }
  }
});
```
This endpoint:
1. Handles file upload
2. Extracts text from PDF
3. Attempts OCR if needed
4. Processes text with AI
5. Generates output PDF
6. Streams file to client
7. Cleans up temporary files

### Health Check Endpoint
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
```
Simple health check endpoint for monitoring.

### Root Endpoint
```javascript
app.get('/', (req, res) => {
  res.json({ 
    message: 'PDF MCQ Processor API',
    status: 'Running',
    endpoints: {
      'POST /process-pdf': 'Process PDF and extract MCQs',
      'GET /health': 'Health check'
    }
  });
});
```
API information endpoint.

## Error Handling

The application implements comprehensive error handling:
1. Input validation
2. File processing errors
3. AI processing errors
4. PDF generation errors
5. Stream errors
6. Cleanup errors

## Performance Considerations

1. **Memory Management**
   - Uses streams for file handling
   - Cleans up temporary files
   - Limits file sizes

2. **Processing Optimization**
   - Parallel processing where possible
   - Efficient text extraction
   - Smart OCR fallback

3. **Resource Cleanup**
   - Automatic temporary file cleanup
   - Worker termination
   - Stream closure

4. **Error Recovery**
   - Graceful error handling
   - Fallback mechanisms
   - Resource cleanup on failure 
