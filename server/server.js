import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";
import multer from "multer";
import fs from "fs/promises";
import mammoth from 'mammoth';
import { createRequire } from "module";


// Figure out current file directory (ESM safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse"); 

const app = express();
const upload = multer({ dest: "uploads/" });

// Load environment variables from a .env file
dotenv.config({ path: path.join(__dirname, '.env') });
const PORT = process.env.PORT || 4000;

// Set up Gemini and the model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Using gemini-1.5-flash for efficient and high-quality summarization.
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Middleware for CORS and JSON body parsing
app.use(cors()); //Allow requests from frontend
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// A simple health check route for the root URL
app.get("/", (req, res) => {
    res.status(200).send("AI Text Summarizer backend is running. Use the /summarize and /ping endpoints.");
});

// Function to extract text from a PDF buffer using a dynamic import for pdf-parse
async function extractTextFromPDF(pdfBuffer) {
    try {
        // Use a dynamic import to ensure the module is loaded correctly
        //const { default: pdf } = await import('pdf-parse');
        if (!Buffer.isBuffer(pdfBuffer)) {
            throw new Error("Expected a Buffer, got " + typeof pdfBuffer);
        }
        const data = await pdf(pdfBuffer);
        return data.text;
    } catch (err) {
        console.error("Error with pdf-parse dynamic import:", err);
        throw new Error("Failed to parse PDF with pdf-parse. Module might be missing.");
    }
}

// Unified API endpoint to handle both file uploads and pasted text
app.post("/summarize", upload.single("file"), async (req, res) => {
    let extractedText = req.body.text;
    let filePath;

    try {
        if (req.file) {
            filePath = req.file.path;
            const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
            
            const dataBuffer = await fs.readFile(filePath);
            
            // Handle different file types
            switch (fileExtension) {
                case 'pdf':
                    extractedText = await extractTextFromPDF(dataBuffer);
                    console.log("PDF parsing completed successfully.");
                    break;
                case 'docx':
                    const result = await mammoth.extractRawText({ arrayBuffer: dataBuffer });
                    extractedText = result.value;
                    console.log("DOCX parsing completed successfully.");
                    break;
                case 'txt':
                    extractedText = dataBuffer.toString('utf8');
                    console.log("TXT parsing completed successfully.");
                    break;
                default:
                    return res.status(400).json({ error: 'Unsupported file type. Please upload a .pdf, .docx, or .txt file.' });
            }
        }
    
        if (!extractedText || extractedText.trim() === "") {
            return res.status(400).json({ error: "No readable text content found to summarize." });
        }
        
        // Check for minimum text length before sending to API
        if (extractedText.length < 100) {
            return res.status(400).json({ error: 'Text is too short to summarize. Minimum 100 characters required.' });
        }

        const prompt = `Summarize the following text clearly and concisely:\n\n${extractedText}`;
        const result = await model.generateContent(prompt);
        const summary = result.response.text();

        res.json({ summary });
    } catch (error) {
        console.error("Error in /summarize endpoint:", error);
        res.status(500).json({ error: "Error generating summary", details: error.message });
    } finally {
        // Ensure the temporary file is always deleted
        if (filePath) {
            try {
                await fs.unlink(filePath);
                console.log(`Temporary file deleted: ${filePath}`);
            } catch (unlinkError) {
                console.error(`Failed to delete temporary file ${filePath}:`, unlinkError);
            }
        }
    }
});

// A simple endpoint to check if the server is running and reachable.
app.get("/ping", (req, res) => {
    console.log("✅ Ping received!");
    res.json({ message: "pong" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
