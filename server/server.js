import express from "express";
import multer from "multer";
import fs from "fs";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const upload = multer({ dest: "uploads/" });
const PORT = process.env.PORT || 3001;

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle text input directly (pasted by user)
app.post("/api/analyze-text", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "No text provided" });
    }

    const result = await model.generateContent(`Analyze this text:\n\n${text}`);
    res.json({ summary: result.response.text() });
  } catch (err) {
    console.error("Error analyzing text:", err);
    res.status(500).json({ error: "Failed to analyze text" });
  }
});

// Handle file uploads (pdf/docx/txt)
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const ext = req.file.originalname.split(".").pop().toLowerCase();

    let textContent = "";
    if (ext === "pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      textContent = data.text;
    } else if (ext === "docx") {
      const data = await mammoth.extractRawText({ path: filePath });
      textContent = data.value;
    } else if (ext === "txt") {
      textContent = fs.readFileSync(filePath, "utf8");
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Call Gemini API
    const result = await model.generateContent(`Analyze this text:\n\n${textContent}`);
    res.json({ summary: result.response.text() });
  } catch (err) {
    console.error("Error processing file:", err);
    res.status(500).json({ error: "Failed to process file" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
