import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath} from 'url';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";
import multer from "multer";
import fs from "fs";

// Figure out current file directory (ESM safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors(//{
    //origin: 'https://''
));
app.use(express.json());
//dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log("Env path:", path.join(__dirname, '.env'));
console.log("API Key Loaded?", !!process.env.GEMINI_API_KEY);

// Multer for file uploads
const upload = multer({ dest: "uploads/" });
const pdfParse = require("pdf-parse");


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.post("/summarize",upload.single("file"), async (req, res) => {
    try {
        let extractedText = req.body.text;
    
        if (req.file && req.file.mimetype === "application/pdf") {
            // small delay to ensure file is fully saved
            await delay(200); // 200 milliseconds delay
            console.log("Uploaded file path:", req.file.path);
            const dataBuffer = fs.readFileSync(req.file.path); 
            console.log("Buffer length:", dataBuffer.length);
            const pdfData = await pdfParse(dataBuffer);
            extractedText = pdfData.text;
            fs.unlinkSync(req.file.path); // delete temp file
        }
    
        if (!extractedText.trim()) {
          return res.status(400).json({ error: "No readable text found" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Summarize the following text cleary and concisely:\n\n${extractedText}`;

        const result = await model.generateContent(prompt);
        const summary = result.response.text();

        res.json({ summary });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error generating summary "});
    }
    
});

// app.post("/summarize", async (req, res) => {
//     const { text } = req.body;
//     console.log("Received text length:", text?.length);

//     // Stimulate mock summary
//     const mockSummary = `This is a mocked summary for testing purposes.
//     It would normally summarize the ${text?.length || 0} characters you provided.`;

//     res.json({
//         choices: [
//             {
//                 message: { content: mockSummary },
//             },
//         ],
//     });
// });

// app.post("/summarize", async (req, res) => {
//     const { text } = req.body;
//     console.log("📥 Received text length:", text?.length);
  
//     try {
//       const openaiRes = await axios.post(
//         "https://api.openai.com/v1/chat/completions",
//         {
//           model: "gpt-4o-mini",
//           messages: [
//             { role: "system", content: "You are a helpful summarizer." },
//             { role: "user", content: `Summarize this:\n\n${text}` },
//           ],
//           temperature: 0.5,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );
  
//       console.log("✅ OpenAI responded");
//       console.log("Choices:", openaiRes.data.choices);
  
//       res.json(openaiRes.data);
//     } catch (err) {
//       console.error("❌ Error from OpenAI:", err.response?.data || err.message);
//       res.status(500).json({ error: err.message, details: err.response?.data });
//     }
//   });
  
app.get("/ping", (req, res) => {
    console.log("✅ Frontend pinged backend!");
    res.json({ message: "pong" });
});
  
app.listen(4000, () => console.log("Server running on port 4000"));
