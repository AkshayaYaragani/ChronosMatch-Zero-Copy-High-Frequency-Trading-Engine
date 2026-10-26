# ChronosMatch:Zero-Copy-High-Frequency-Trading-Engine
A financial Limit Order Book (LOB) matching engine built in Python and Cython. The engine bypasses Python’s Garbage Collector pauses and IPC serialization overhead through memory-mapped (mmap) circular ring buffers, cache-line aligned C-structs, and lock-free atomic sequence cursors.
## Run Locally

### Prerequisites

Install the following software before starting:

- [Node.js](https://nodejs.org/) 20 or newer (npm is included with Node.js)
- [Python](https://www.python.org/downloads/) 3.10 or newer
- Git, if you are cloning the project from a repository

During Python installation on Windows, enable **Add Python to PATH**.

### 1. Get the project

Clone the repository and open a terminal in the project folder:

```bash
git clone <repository-url>
cd INFOTACT-PROJECT # change the directory to yours folder 
```

If the project was provided as a ZIP file, extract it and open the terminal
inside the extracted `INFOTACT-PROJECT` folder instead.

### 2. Install JavaScript dependencies

On macOS, Linux, or Windows terminals where npm scripts are enabled:

```bash
npm install
```

On Windows PowerShell, if you see an error saying that `npm.ps1` cannot be
loaded because script execution is disabled, use the Windows command shim:

```powershell
npm.cmd install
```

### 3. Configure the Gemini API key

Create a file named `.env.local` in the project root and add your Gemini API
key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get an API key from [Google AI Studio](https://aistudio.google.com/apikey).
Never commit `.env.local` or share your API key.

Firebase configuration is already provided in
[`firebase-applet-config.json`](./firebase-applet-config.json). If you are
using a different Firebase project, replace that configuration with the
configuration for your own project and configure the required Firebase
Authentication and Firestore settings.

### 4. Start the development server

Run:

```bash
npm run dev
```

On Windows PowerShell, use this command if `npm` is blocked by the execution
policy:

```powershell
npm.cmd run dev
```

The server starts the ChronosMatch Python engine automatically. If your
system does not recognize `python3`, create a `python3` command that points to
your Python installation, or update the `spawn('python3', ...)` calls in
[`server.ts`](./server.ts) to use `python` on Windows.

Open the application at:

```text
http://localhost:3000
```

Press `Ctrl+C` in the terminal to stop the development server.

## Useful commands

```bash
# Type-check the project
npm run lint

# Create a production build
npm run build

# Preview the production frontend
npm run preview
```

On Windows PowerShell, replace `npm` with `npm.cmd` in these commands if the
execution-policy error occurs.

## Troubleshooting

### `npm.ps1 cannot be loaded`

Use `npm.cmd` instead of `npm`, for example:

```powershell
npm.cmd run dev
```

Alternatively, allow scripts only for the current PowerShell session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm run dev
```

### `GEMINI_API_KEY` is missing

Confirm that `.env.local` is in the project root, next to `package.json`, and
that the variable is written as `GEMINI_API_KEY=...` without an extra space.

### Python engine does not start

Verify the Python installation:

```powershell
python --version
python3 --version
```

If only `python` works on Windows, update the Python executable name used by
the server as described above, then restart the development server.

Week 1 Progress

I reviewed the ChronosMatch project README and explored its setup instructions. I learned about the purpose of a limit order book matching engine and the importance of low-latency processing.

Learning Outcomes

- Understood the project overview.
- Reviewed the local setup instructions.
- Learned the basic concepts of high-frequency trading.