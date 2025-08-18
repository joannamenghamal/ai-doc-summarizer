import { useState } from 'react';
import './App.css';

// Main application component
const App = () => {
    // State to manage the active tab (text or file)
    const [activeTab, setActiveTab] = useState('text');
    // State for text input
    const [textInput, setTextInput] = useState('');
    // State for the uploaded file
    const [file, setFile] = useState<File | null>(null);
    // State for loading status
    const [loading, setLoading] = useState(false);
    // State for the summary output
    const [summary, setSummary] = useState('');
    // State for error messages
    const [error, setError] = useState('');
    // State for ping status
    const [pingStatus, setPingStatus] = useState('');

    // URL of your backend server
    const backendUrl = "https://ai-doc-summarizer-api.onrender.com";

    // Function to handle tab switching
    const showTab = (tab: string) => {
        setActiveTab(tab);
        setSummary('');
        setError('');
    };

    // Function to handle API calls for summarization
    const callSummarize = async (data: FormData) => {
        setLoading(true);
        setSummary('');
        setError('');
        setPingStatus('');

        try {
            const response = await fetch(`${backendUrl}/summarize`, {
                method: 'POST',
                body: data
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Server responded with an error.");
            }

            const result = await response.json();
            setSummary(result.summary);
        } catch (err) {
            console.error("Error summarizing:", err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Event handler for text summarization
    const handleTextSummarize = () => {
        if (!textInput.trim()) {
            setError("Please enter some text to summarize.");
            return;
        }
        const formData = new FormData();
        formData.append('text', textInput);
        callSummarize(formData);
    };

    // Event handler for file summarization
    const handleFileSummarize = () => {
        if (!file) {
            setError("Please select a file to upload.");
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        callSummarize(formData);
    };
    
    // Event handler for the server ping
const handlePing = async () => {
    try {
        const response = await fetch(`${backendUrl}/ping`);
        const result = await response.json();
        setPingStatus(result.message);
    } catch (err) {
        console.error("Ping failed:", err);
        setPingStatus("Could not connect to the server.");
    }
};

    return (
        <div className="bg-blue-500 min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8">
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-xl md:max-w-3xl">
                <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-4 sm:mb-6">AI Document Summarizer</h1>
                
                {/* Tab navigation */}
                <div className="flex border-b-2 border-gray-200 mb-4 sm:mb-6">
                    <button
                        className={`py-3 px-4 text-sm sm:text-base font-medium transition-colors duration-200 focus:outline-none ${
                            activeTab === 'text'
                                ? 'text-blue-600 font-extrabold border-b-4 border-blue-600'
                                : 'text-gray-500 hover:text-blue-600'
                        }`}
                        onClick={() => showTab('text')}
                    >
                        Summarize Text
                    </button>
                    <button
                        className={`py-3 px-4 text-sm sm:text-base font-medium transition-colors duration-200 focus:outline-none ${
                            activeTab === 'file'
                                ? 'text-blue-600 font-extrabold border-b-4 border-blue-600'
                                : 'text-gray-500 hover:text-blue-600'
                        }`}
                        onClick={() => showTab('file')}
                    >
                        Summarize File
                    </button>
                </div>

                {/* Input and Summary Area */}
                <div className={activeTab === 'text' ? '' : 'hidden'}>
                    <label htmlFor="text-input" className="block text-gray-700 font-medium mb-2">Paste your text here:</label>
                    <textarea
                        id="text-input"
                        rows={10}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                    ></textarea>
                    <button
                        className="mt-4 w-full bg-blue-600 text-white font-bold py-2 sm:py-3 px-4 rounded-xl shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                        onClick={handleTextSummarize}
                    >
                        Summarize Text
                    </button>
                </div>

                <div className={activeTab === 'file' ? '' : 'hidden'}>
                    <label htmlFor="file-upload" className="block text-gray-700 font-medium mb-2">Upload a file:</label>
                    <input
                        type="file"
                        id="file-upload"
                        accept=".pdf,.doc,.txt"
                        className="block text-gray-700 w-full p-2 sm:p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                setFile(e.target.files[0]);
                            }
                        }}
                    />
                    <button
                        className="mt-4 w-full bg-blue-600 text-white font-bold py-2 sm:py-3 px-4 rounded-xl shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                        onClick={handleFileSummarize}
                    >
                        Summarize File
                    </button>
                </div>

                {/* Loading spinner */}
                {loading && (
                    <div className="text-center mt-6">
                        <div className="animate-spin inline-block w-10 h-10 border-4 border-t-4 border-blue-500 border-opacity-25 rounded-full"></div>
                        <p className="text-gray-500 mt-2">Generating summary...</p>
                    </div>
                )}

                {/* Summary output area */}
                {summary && (
                    <div className="mt-6">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Summary:</h2>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap text-gray-700 text-sm sm:text-base">
                            {summary}
                        </div>
                    </div>
                )}

                {/* Error message box */}
                {error && (
                    <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <button
                        id="ping-btn"
                        className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
                        onClick={handlePing}
                    >
                        Test Server Connection
                    </button>
                    {pingStatus && (
                        <p className={`mt-2 text-sm ${
                            pingStatus.startsWith('Could not') ? 'text-red-500' : 'text-green-500'
                        }`}>
                            {pingStatus}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
