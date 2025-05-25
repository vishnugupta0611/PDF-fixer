// Required packages
const express = require('express');
const cors = require('cors');
const fileupload = require('express-fileupload');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const path = require('path');
const poppler = require('pdf-poppler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const PDFDocument = require('pdfkit');
const JSON5 = require('json5'); // Required for safe parsing

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
};

// OCR Function
async function extractTextWithOCR(pdfPath) {
  const worker = await createWorker();
  const outputDir = path.join(__dirname, 'temp');
  const outputPrefix = `page_${Date.now()}`;
  let combinedText = '';
  let generatedFiles = [];

  try {
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    fs.mkdirSync(outputDir, { recursive: true });

    await poppler.convert(pdfPath, {
      format: 'png',
      out_dir: outputDir,
      out_prefix: outputPrefix,
    });

    const files = fs.readdirSync(outputDir);
    const pngFiles = files.filter(f => f.endsWith('.png') && f.includes(outputPrefix));
    if (pngFiles.length === 0) throw new Error('No image files generated');

    generatedFiles = pngFiles.sort((a, b) => {
      const aPage = parseInt(a.split('-')[1]);
      const bPage = parseInt(b.split('-')[1]);
      return aPage - bPage;
    });

    for (const file of pngFiles) {
      const imagePath = path.join(outputDir, file);
      const { data } = await worker.recognize(imagePath);
      combinedText += `Page ${file.split('-')[1]}\n${data.text}\n\n`;
    }

    return {
      text: combinedText.trim(),
      isOCR: true,
      generatedFiles,
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
-respond with upto 90 questions only
Now convert the following MCQs to JSON:

"""
${inputText}
"""
`;

  const genAI = new GoogleGenerativeAI('AIzaSyBOA6nnVD3nzsv_KeEnyGvFvjmrdvZ_Bns');
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  console.log(text);
  return text;
}

// Gemini JSON Extractor
function extractJsonFromGeminiResponse(text) {
  try {
    const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No valid JSON block found');
    }

    const jsonText = cleaned.substring(start, end + 1);
    return JSON5.parse(jsonText);
  } catch (err) {
    console.error('❌ Failed to extract valid JSON:', err.message);
    return null;
  }
}

// POST Endpoint
app.post('/process-pdf', async (req, res) => {
  let generatedFiles = [];

  try {
    if (!req.files?.pdf) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const pdfFile = req.files.pdf;
    const tempPath = pdfFile.tempFilePath;

    // Text extraction
    const pdfData = await pdfParse(fs.readFileSync(tempPath));
    let text = pdfData.text;
    let isOCR = false;

    if (!text || text.replace(/\s+/g, '').length < 15) {
      const ocrResult = await extractTextWithOCR(tempPath);
      text = ocrResult.text;
      isOCR = ocrResult.isOCR;
      generatedFiles = ocrResult.generatedFiles;
    }

    const correctmcqs = await getcorrectmcqs(text);
    const parsed = extractJsonFromGeminiResponse(correctmcqs);

    if (!parsed || !Array.isArray(parsed.questions)) {
      return res.status(500).json({
        error: 'Invalid or incomplete JSON returned from Gemini.',
        raw: correctmcqs,
      });
    }

    const timestamp = Date.now();
    const outputPath = path.join(__dirname, './output', `${pdfFile.name}_${timestamp}.pdf`);
    generateQuestionPDF(parsed.questions, outputPath);
    res.download(outputPath, `${pdfFile.name}_${timestamp}.pdf`);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Processing failed',
      details: error.message,
    });
  } finally {
    if (req.files?.pdf?.tempFilePath && fs.existsSync(req.files.pdf.tempFilePath)) {
      fs.unlinkSync(req.files.pdf.tempFilePath);
    }

    const tempDir = path.join(__dirname, 'temp');
    generatedFiles.forEach(file => {
      const filePath = path.join(tempDir, file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  }
});

// Start server
app.listen(3000, () => {
  console.log('🚀 Server running on port 3000');
});
