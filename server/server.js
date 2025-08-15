import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";
import multer from "multer";
import fs from "fs/promises";
import mammoth from 'mammoth';

// Importing pdfjs-dist and its worker
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Figure out current file directory (ESM safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix for pdfjs-dist on the server-side.
// We must point to a local worker file, not a CDN.
GlobalWorkerOptions.workerSrc = path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.js');

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config({ path: path.join(__dirname, '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log("Env path:", path.join(__dirname, '.env'));
console.log("API Key Loaded?", !!process.env.GEMINI_API_KEY);

// Multer for file uploads - destination is the 'uploads' folder
const upload = multer({ dest: "uploads/" });

// A simple utility to introduce a small delay if needed.
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to extract text from a PDF buffer
async function extractTextFromPDF(pdfBuffer) {
    const pdf = await getDocument({ data: pdfBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
}

app.get("/", (req, res) => {
    res.send("Server is running!");
});

app.post("/summarize", upload.single("file"), async (req, res) => {
    let extractedText = req.body.text;
    let filePath;

    try {
        if (req.file) {
            filePath = req.file.path;
            const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
            console.log(`Uploaded file path: ${filePath}`);
            
            const dataBuffer = await fs.readFile(filePath);
            console.log(`Buffer length: ${dataBuffer.length}`);
            
            // Handle different file types
            switch (fileExtension) {
                case 'pdf':
                    extractedText = await extractTextFromPDF(dataBuffer);
                    console.log("PDF parsing completed successfully with pdfjs-dist.");
                    break;
                case 'doc':
                case 'docx':
                    const result = await mammoth.extractRawText({ arrayBuffer: dataBuffer });
                    extractedText = result.value;
                    console.log("DOCX parsing completed successfully with mammoth.");
                    break;
                case 'txt':
                    extractedText = dataBuffer.toString('utf8');
                    console.log("TXT parsing completed successfully.");
                    break;
                default:
                    return res.status(400).json({ error: 'Unsupported file type.' });
            }
        }
    
        if (!extractedText || !extractedText.trim()) {
            return res.status(400).json({ error: "No readable text or PDF content found" });
        }
        
        // Check for minimum text length before sending to API
        if (extractedText.length < 100) {
            return res.status(400).json({ error: 'Text is too short to summarize. Minimum 100 characters required.' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Summarize the following text clearly and concisely:\n\n${extractedText}`;

        const result = await model.generateContent(prompt);
        const summary = result.response.text();

        res.json({ summary });
    } catch (error) {
        console.error("Error in /summarize endpoint:", error);
        res.status(500).json({ error: "Error generating summary", details: error.message });
    } finally {
        // Clean up temporary file
        if (filePath) {
            try {
                await fs.access(filePath);
                await fs.unlink(filePath);
                console.log(`Temporary file deleted: ${filePath}`);
            } catch (unlinkError) {
                console.error(`Failed to delete temporary file ${filePath}:`, unlinkError);
            }
        }
    }
});

app.get("/ping", (req, res) => {
    console.log("✅ Frontend pinged backend!");
    res.json({ message: "pong" });
});
  
app.listen(4000, () => console.log("Server running on port 4000"));
