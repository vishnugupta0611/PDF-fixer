const express = require('express');
const app = express();
const cors = require('cors');
const fileupload = require('express-fileupload');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const path = require('path');
const poppler = require('pdf-poppler');

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(
  fileupload({
    useTempFiles: true,
    tempFileDir: '/tmp',
  })
);

// OCR for all pages
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

    // Convert ALL pages of the PDF to PNG images
    await poppler.convert(pdfPath, {
      format: 'png',
      out_dir: outputDir,
      out_prefix: outputPrefix,
    });

    const files = fs.readdirSync(outputDir);
    const pngFiles = files.filter(f => f.endsWith('.png') && f.includes(outputPrefix));
    if (pngFiles.length === 0) throw new Error('No image files generated');

    generatedFiles = pngFiles;

    // Sort by page number
    pngFiles.sort((a, b) => {
      const aPage = parseInt(a.split('-')[1]);
      const bPage = parseInt(b.split('-')[1]);
      return aPage - bPage;
    });

    // OCR for each page
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

// PDF Processing Endpoint
app.post('/process-pdf', async (req, res) => {
  let generatedFiles = [];
  try {
    if (!req.files?.pdf) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const pdfFile = req.files.pdf;
    const tempPath = pdfFile.tempFilePath;

    // Try normal extraction
    const pdfData = await pdfParse(fs.readFileSync(tempPath));
    let text = pdfData.text;
    let isOCR = false;

    // Fallback to OCR if extracted text is too little
    if (!text || text.replace(/\s+/g, '').length < 15) {
      const ocrResult = await extractTextWithOCR(tempPath);
      text = ocrResult.text;
      isOCR = ocrResult.isOCR;
      generatedFiles = ocrResult.generatedFiles;
    }

    res.json({
      text: text.trim(),
      isOCR,
      filename: pdfFile.name,
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Processing failed',
      details: error.message
    });

  } finally {
    // Delete uploaded temp file
    if (req.files?.pdf?.tempFilePath && fs.existsSync(req.files.pdf.tempFilePath)) {
      fs.unlinkSync(req.files.pdf.tempFilePath);
    }

    // Delete generated PNGs
    const tempDir = path.join(__dirname, 'temp');
    generatedFiles.forEach(file => {
      const filePath = path.join(tempDir, file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
