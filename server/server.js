import { GoogleGenerativeAI } from "@google/generative-ai";
import multer from "multer";
import fs from "fs/promises";
import pdfjsLib from 'pdfjs-dist'; // Updated import to handle CommonJS module
// Destructure the necessary objects from the imported library
const { getDocument, GlobalWorkerOptions } = pdfjsLib;

// Figure out current file directory (ESM safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure pdfjs-dist worker source
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

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

app.post("/summarize", upload.single("file"), async (req, res) => {
    let extractedText = req.body.text;
    let filePath;

    try {
        if (req.file && req.file.mimetype === "application/pdf") {
            filePath = req.file.path;
            console.log(`Uploaded file path: ${filePath}`);

            const dataBuffer = await fs.readFile(filePath);
            console.log(`Buffer length: ${dataBuffer.length}`);

            // Call the new function to extract text using pdfjs-dist
            extractedText = await extractTextFromPDF(dataBuffer);
            console.log("PDF parsing completed successfully with pdfjs-dist.");
        }

        if (!extractedText || !extractedText.trim()) {
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