# 📚 AI Literary EPUB Translator
> **Gemini 1.5 Flash Powered Literary Translation & Style Analysis Tool**

This project goes beyond standard machine translation to transfer the **soul of literary works, the author's style, and the text's emotion** into the target language. It utilizes the Google Gemini API and runs entirely **Client-Side (Serverless)**. No server installation is required.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Tech Stack](https://img.shields.io/badge/Tech-HTML%20%7C%20TS%20%7C%20Gemini%20API-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🌟 Key Features

* **🧠 Deep Style Analysis:** Analyzes the text before translation to identify the potential author and narrative tone (melancholic, sarcastic, enthusiastic, etc.).
* **🎨 Literary Fidelity (Style Transfer):** Translates while preserving the detected style. It focuses on "How would the author write this in the target language?" rather than word-for-word translation.
* **🛡️ HTML & CSS Preservation:** Never breaks HTML tags (`<p>`, `<em>`, `class="..."`) found in EPUB formats. The original layout remains intact.
* **🚫 Uncensored & Bold:** Remains faithful to the author's original expression to maintain literary integrity (depending on user preference).
* **🔒 100% Secure & Client-Side:** Your API key is **never** sent to an intermediary server. It communicates directly with Google servers from your browser.
* **📄 Print-Ready PDF:** Formats the output with print-quality CSS, ready to be saved as a PDF directly from the browser.

## 🚀 How It Works

The system operates using a specialized **"System Instruction"** designed on Google AI Studio.

1.  **Input:** The user enters raw text or HTML code.
2.  **Process:** The AI first analyzes the text (returned in JSON format) and then translates it.
3.  **Output:** Provides both the style analysis report and the translated HTML block ready for rendering.

## 🛠️ Installation & Usage

This project is a static website. It does **not** require Python or Node.js installation.

### Method 1: Direct Use (Local)
1.  Download or clone this repository to your machine.
2.  Open the `index.html` file in your browser (Chrome/Edge/Firefox).
3.  Enter your **Google AI Studio API Key** and start translating.

## 🧩 Technical Architecture

* **Frontend:** HTML5, TailwindCSS (CDN), Vanilla JavaScript / TypeScript.
* **AI Engine:** Google Gemini 1.5 Flash (via REST API).
* **Data Format:** JSON (Request/Response structure is strictly enforced for reliability).

## ⚠️ Disclaimer

This tool uses the Google Gemini API. On the Free Tier, your data may be used by Google for model training. Please consider Google's API terms of use when translating confidential or copyrighted commercial data that you do not own.

---

### 🤝 Contributing
Feel free to submit a "Pull Request" to improve the project or add new features (e.g., batch file processing)!


**License:** MIT License.
