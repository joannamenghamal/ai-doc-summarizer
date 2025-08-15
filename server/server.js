import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";
import multer from "multer";
import fs from "fs/promises"; // Use the promises API for async file operations

// Figure out current file directory (ESM safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

app.post("/summarize", upload.single("file"), async (req, res) => {
    let extractedText = req.body.text;
    let filePath;

    try {
        if (req.file && req.file.mimetype === "application/pdf") {
            filePath = req.file.path;
            console.log(`Uploaded file path: ${filePath}`);

            // Use the promises API for safer, non-blocking file operations
            const dataBuffer = await fs.readFile(filePath);
            console.log(`Buffer length: ${dataBuffer.length}`);
            const pdfData = await pdfParse(dataBuffer);
            extractedText = pdfData.text;
            console.log("PDF parsing completed successfully.");
        }
    
        if (!extractedText || !extractedText.trim()) {
            // Check for empty text after parsing
            return res.status(400).json({ error: "No readable text or PDF content found" });
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
        // IMPORTANT: Ensure the temporary file is always deleted
        if (filePath) {
            try {
                // Check if the file still exists before attempting to unlink
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
