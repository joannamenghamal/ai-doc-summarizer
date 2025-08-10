import './index.css'
import './App.css'
import { useState } from "react";
import axios from "axios";


function App() {
  const [fileContent, setFileContent] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setFileContent(file);
      }
    };
    reader.readAsText(file);
  }
  
  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPastedText(e.target.value);
  }
  
  async function summarizeText() {
    if (!pastedText && !fileContent) return;

    setLoading(true); //start loading
    setSummary("Generating summary..."); //clear previous summary

    try { 
      const formData = new FormData();

      if (fileContent) {
        formData.append("file", fileContent);
      } else if (pastedText) {
        formData.append("text", pastedText);
      }
      const res = await axios.post("http://localhost:4000/summarize", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      
      console.log("Backend response:", res.data)
      // const summaryText = res.data?.choices?.[0]?.message?.content; (This is for OpenAI Api)
      const summaryText = res.data?.summary;
      setSummary(summaryText || "No summary generated.");
    } catch (error) {
      console.error(error);
      setSummary("Error generating summary.");
    } finally {
      setTimeout(() => setLoading(false), 500);  //stop loading
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      {/* Header */}
      <header className="max-w-3xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Document Summarizer</h1>
        <p className="text-gray-600">
          Turn long documents into clear summaries in seconds.
        </p>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto space-y-6">
        {/* Upload box */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-white shadow-sm">
          <p className="mb-2 text-gray-700 font-medium">
            Upload PDF, DOCX, or TXT
          </p>
          <input type="file" onChange={handleFileUpload} className="mt-2" />
        </div>

        {/* OR divider */}
        <div className="flex items-center justify-center text-gray-500">
          <span className="px-4 bg-gray-50">OR</span>
        </div>

        {/* Text input */}
        <textarea
          className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          placeholder="Paste your text here..."
          rows={6}
          value={pastedText}
          onChange={handleTextChange}
        />

        {/* Summarize button */}
        <button 
          onClick={summarizeText}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition flex items-center justify-center">

          {loading ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                  stroke="white"
                  strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="white"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          ) : (
            "Summarize"
          )}

        </button>

        {/* Summary results */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Summary</h2>
          <p className="text-gray-700 max-h-60 overflow--auto">
            {summary || "Your summary will appear here after processing."}
          </p>
        </div>
      </main>
    </div>
  );
}


export default App;
