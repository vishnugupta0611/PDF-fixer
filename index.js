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
const sharp = require('sharp'); // Alternative to poppler

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

// PDF generation
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

// Alternative OCR function without poppler dependency
async function extractTextWithOCR(pdfPath) {
  const worker = await createWorker();
  let combinedText = '';

  try {
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    // Try to extract first page as image using a different approach
    // Since we can't convert PDF to image easily without poppler,
    // we'll rely more on pdf-parse and use OCR as fallback
    
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

// Gemini Prompt Processor
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
    },
    {
      "q2.": "Second question...",
      ...
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

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyCsJfTPCG9SLEBxcTxr3CqIu-BLRH1BmA0');
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    apiVersion: "v1"
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  console.log('Gemini response received');
  return text;
}

// Clean text function
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '');
}

// Extract questions function
function extractValidQuestionsFromText(text) {
  try {
    // Try to parse as complete JSON first
    const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed;
      }
    } catch (e) {
      console.log('Full JSON parse failed, trying regex approach');
    }

    // Fallback: Extract individual question objects
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

// Main endpoint
app.post('/process-pdf', async (req, res) => {
  let generatedFiles = [];
  let outputPath = null;

  try {
    console.log('Processing PDF request...');
    
    if (!req.files?.pdf) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const pdfFile = req.files.pdf;
    const tempPath = pdfFile.tempFilePath;

    console.log('Extracting text from PDF...');
    
    // Primary text extraction using pdf-parse
    const pdfData = await pdfParse(fs.readFileSync(tempPath));
    let text = pdfData.text;
    let isOCR = false;

    console.log('Extracted text length:', text.length);

    // If text is too short, try OCR (though limited without poppler)
    if (!text || text.replace(/\s+/g, '').length < 50) {
      console.log('Text too short, attempting OCR...');
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
        error: 'Could not extract sufficient text from PDF. Please ensure the PDF contains readable text or try a different file.' 
      });
    }
    
    text = cleanText(text);
    console.log('Sending to Gemini for processing...');
    
    const correctmcqs = await getcorrectmcqs(text);
    const parsed = extractValidQuestionsFromText(correctmcqs);
    
    console.log('Parsed questions count:', parsed?.questions?.length || 0);
    
    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return res.status(500).json({
        error: 'No valid MCQs found in the document. Please ensure your PDF contains properly formatted multiple choice questions.',
        details: 'The document may not contain MCQs or they may not be in a recognizable format.'
      });
    }

    const timestamp = Date.now();
    outputPath = path.join(__dirname, './output', `${pdfFile.name}_${timestamp}.pdf`);
    
    console.log('Generating output PDF...');
    await generateQuestionPDF(parsed.questions, outputPath);
    
    if (!fs.existsSync(outputPath)) {
      throw new Error('PDF generation failed - file not created');
    }

    console.log('Sending PDF to client...');
    
    // Set proper headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFile.name}_processed_${timestamp}.pdf"`);
    res.setHeader('Content-Length', fs.statSync(outputPath).size);
    
    // Stream the file to response
    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);
    
    // Clean up files after streaming
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
    // Clean up temp files
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});