
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

To enable Google Login on a deployment, open Firebase Console for the
configured project, go to **Authentication > Settings > Authorized domains**,
and add the exact hostname shown in the browser address bar. For the current
production deployment, add
`chronosmatch-zero-copy-high-frequen.vercel.app` (and `localhost` for local
development). Also enable the **Google** provider under
**Authentication > Sign-in method**.

The Instant Institutional Trader button uses Firebase Anonymous Authentication
to obtain a real ID token. Enable the **Anonymous** provider under
**Authentication > Sign-in method** as well. If it is disabled, the UI now
reports the configuration issue and does not continue with an unauthenticated
fallback.

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

The server starts the ChronosMatch Python engine automatically. On Windows,
the server uses the Python Launcher (`py -3`) automatically; on macOS and
Linux it uses `python3`. If Python is not installed or is not available on
your PATH, install Python and enable **Add Python to PATH**, then restart the
server. You can also set `PYTHON_EXECUTABLE` in `.env.local` to an explicit
Python executable path.

Open the application at:

```text
http://localhost:3000
```

### Paper trading

The **Paper Trading Desk** is a simulation-only account for validating execution
ideas against the live simulated quote. It starts with a virtual $100,000
balance, tracks positions and realized/unrealized P&L, persists orders under
the server runtime directory, and enforces order-size, notional, position, and
daily-loss limits. The kill switch cancels open paper orders and blocks new
submissions.

Paper orders are intentionally isolated from the Python matching engine and
from all broker/exchange integrations. They never represent real-money
execution. Resetting the desk clears its virtual account and order history.
The desk also provides searchable and status-filtered order history, fill and
rejection summary metrics, and an **EXPORT CSV** action for offline review or
strategy analysis.

### Latency and throughput benchmark

The **Zero-Copy Benchmark** tab runs the same order workload through the
memory-mapped ring-buffer path, Pickle IPC, and JSON serialization. It reports
throughput, total and phase timings, p50/p90/p99/p99.9 latency, and measured
Python garbage-collection counts. The dashboard keeps the latest eight runs
for variance comparison and can export the latest comparison as CSV for
offline review.

### Security configuration

The server protects engine controls, paper-trading actions, RAG, and Gemini
routes with Firebase ID-token verification. Configure Firebase Admin
credentials with `FIREBASE_SERVICE_ACCOUNT_JSON` or application default
credentials, and set `CHRONOS_OPERATOR_EMAILS` to a comma-separated list of
trusted operator emails. Users must sign in through Firebase before using
protected features; engine controls and paper risk controls additionally
require an operator claim or allowlisted email.

If port 3000 is already being used, the server automatically tries the next
available port and prints the actual URL in the terminal.

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

## Deploy to Vercel

This repository includes [`vercel.json`](./vercel.json) for deploying the Vite
frontend. From the project root, run:

```powershell
npx vercel
```

For a production deployment:

```powershell
npx vercel --prod
```

The Express/Python ChronosMatch engine in `server.ts` is intended for the
local full-stack server and is not started by this static Vercel deployment.
The included [`Dockerfile`](./Dockerfile) and [`render.yaml`](./render.yaml)
deploy the persistent Node/Python engine to Render. Set `FRONTEND_URL` to the
Vercel production URL, then set `VITE_API_URL` in the Vercel project to the
Render service URL and redeploy. This enables the live engine API and SSE
telemetry stream used by the order book.

### Oracle Cloud Always Free VM

For a continuously running free-tier backend, create an Ubuntu VM in Oracle
Cloud Always Free, allow inbound TCP port 80 in its security list, then run:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/ProgrammerVrushabh/ChronosMatch-Zero-Copy-High-Frequency-Trading-Engine/main/oracle/install.sh)"
```

The script installs Docker, starts the engine with systemd, and serves the API
on port 80. Set Vercel's `VITE_API_URL` to the VM's public IP, then redeploy
the frontend. Use a reserved public IP or domain name so the Vercel setting
does not change.

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
The rest of the application can still start without this key, but Gemini
chat and RAG requests return an explanatory HTTP 503 response until the key
is configured.

### Python engine does not start

Verify the Python installation:

```powershell
python --version
python3 --version
```

On Windows, verify the Python Launcher as well:

```powershell
py -3 --version
```

If `py -3` does not work, set `PYTHON_EXECUTABLE` in `.env.local` to the full
path of `python.exe`, then restart the development server.

### Port 3000 or Vite HMR port is already in use

The server automatically selects the next available application port if port
3000 is occupied. Vite is configured to use the existing Express server for
WebSocket handling, so another development process will not prevent this
application from starting.
