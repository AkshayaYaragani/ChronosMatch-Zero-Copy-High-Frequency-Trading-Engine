import express from 'express';
import http from 'http';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import {
  getAllDocuments,
  addDocument,
  searchKnowledgeBase,
  buildRAGContext
} from './src/rag/knowledgeStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local'), quiet: true });
dotenv.config({ quiet: true });

const app = express();
const server = http.createServer(app);
const runtimeDir = process.env.CHRONOS_RUNTIME_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'chronosmatch-'));
const configuredPort = Number.parseInt(process.env.PORT || '3000', 10);
const PORT = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3000;
const DEFAULT_ENGINE_RATE = 25000;
const MAX_BENCHMARK_COUNT = 1_000_000;

app.use(express.json());

const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    })
  : null;

if (!ai) {
  console.warn('[Gemini] GEMINI_API_KEY is not configured. Gemini endpoints will return HTTP 503.');
}

function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured. Add it to .env.local and restart the server.');
  }
  return ai;
}

function getPythonCommand(): { command: string; args: string[] } {
  if (process.env.PYTHON_EXECUTABLE) {
    return { command: process.env.PYTHON_EXECUTABLE, args: [] };
  }
  if (process.platform === 'win32') {
    return { command: 'py', args: ['-3'] };
  }
  return { command: 'python3', args: [] };
}

function spawnPython(args: string[], options: Parameters<typeof spawn>[2]): ChildProcess {
  const python = getPythonCommand();
  const child = spawn(python.command, [...python.args, ...args], {
    ...options,
    env: {
      ...process.env,
      CHRONOS_RUNTIME_DIR: runtimeDir
    }
  });
  child.once('error', (error) => {
    console.error(`[Python] Unable to start ${python.command}: ${error.message}`);
  });
  return child;
}

function listenOnAvailablePort(port: number): void {
  let settled = false;
  const handleListening = () => {
    if (settled) {
      return;
    }
    settled = true;
    server.removeListener('error', handleError);
    const address = server.address();
    const activePort = typeof address === 'object' && address ? address.port : port;
    console.log(`[ChronosMatch] Full-stack engine UI server running on http://localhost:${activePort}`);
  };
  const handleError = (error: NodeJS.ErrnoException) => {
    if (settled) {
      return;
    }
    settled = true;
    server.removeListener('listening', handleListening);
    if (error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`[Server] Port ${port} is already in use; trying ${nextPort}.`);
      server.removeListener('error', handleError);
      server.close(() => listenOnAvailablePort(nextPort));
      return;
    }
    console.error('[Server] Failed to start:', error);
    process.exitCode = 1;
  };

  server.once('listening', handleListening);
  server.once('error', handleError);
  server.listen(port);
}

// Engine Process State
let pythonProcess: ChildProcess | null = null;
let latestTelemetry: any = null;
const sseClients: Set<express.Response> = new Set();

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parsePositiveInteger(value: unknown, fallback: number, maximum = Number.MAX_SAFE_INTEGER): number {
  const parsed = typeof value === 'number' || typeof value === 'string'
    ? Number(value)
    : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
}

function normalizeSymbol(value: unknown, fallback = 'NVDA'): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const symbol = value.trim().toUpperCase();
  return /^[A-Z0-9._-]{1,20}$/.test(symbol) ? symbol : fallback;
}

function startPythonEngine(rate = DEFAULT_ENGINE_RATE, symbol = 'NVDA') {
  if (pythonProcess) {
    return { status: 'already_running', pid: pythonProcess.pid };
  }

  const normalizedRate = parsePositiveInteger(rate, DEFAULT_ENGINE_RATE);
  const normalizedSymbol = normalizeSymbol(symbol);
  const scriptPath = path.join(__dirname, 'chronosmatch', 'runner.py');
  const child = spawnPython([scriptPath, '--rate', String(normalizedRate), '--symbol', normalizedSymbol], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  pythonProcess = child;

  console.log(`[ChronosMatch] Python engine spawned (PID: ${child.pid})`);

  let stdoutBuffer = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('CHRONOS_JSON:')) {
        try {
          const jsonStr = line.slice('CHRONOS_JSON:'.length);
          const data = JSON.parse(jsonStr);
          latestTelemetry = data;
          broadcastSSE('telemetry', data);
        } catch (error) {
          console.error('[Python] Invalid telemetry payload:', getErrorMessage(error));
        }
      } else if (line.startsWith('CHRONOS_RESP:')) {
        try {
          const resp = JSON.parse(line.slice('CHRONOS_RESP:'.length));
          broadcastSSE('response', resp);
        } catch (error) {
          console.error('[Python] Invalid response payload:', getErrorMessage(error));
        }
      }
    }
  });

  child.stderr?.on('data', (errChunk: Buffer) => {
    console.error(`[Python Engine Stderr]:`, errChunk.toString());
  });

  child.once('error', (error) => {
    console.error('[ChronosMatch] Python engine process error:', getErrorMessage(error));
    if (pythonProcess === child) {
      pythonProcess = null;
      broadcastSSE('engine_status', { running: false, error: getErrorMessage(error) });
    }
  });

  child.on('close', (code) => {
    console.log(`[ChronosMatch] Python engine stopped with code ${code}`);
    if (pythonProcess !== child) {
      return;
    }
    pythonProcess = null;
    broadcastSSE('engine_status', { running: false, code });
  });

  return { status: 'started', pid: child.pid };
}

function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of [...sseClients]) {
    if (client.writableEnded || client.destroyed) {
      sseClients.delete(client);
      continue;
    }
    try {
      client.write(payload);
    } catch (error) {
      console.error('[SSE] Failed to write event:', getErrorMessage(error));
      sseClients.delete(client);
      client.destroy();
    }
  }
}

// Start engine by default on boot
try {
  startPythonEngine(DEFAULT_ENGINE_RATE, 'NVDA');
} catch (error) {
  console.error('[ChronosMatch] Error auto-starting engine:', getErrorMessage(error));
}

// REST Endpoints
app.get('/api/engine/status', (req, res) => {
  res.json({
    running: !!pythonProcess,
    pid: pythonProcess?.pid || null,
    latestTelemetry
  });
});

app.post('/api/engine/start', (req, res) => {
  const rate = parsePositiveInteger(req.body?.rate, DEFAULT_ENGINE_RATE);
  const symbol = normalizeSymbol(req.body?.symbol);
  const result = startPythonEngine(rate, symbol);
  res.json(result);
});

app.post('/api/engine/stop', (req, res) => {
  const processToStop = pythonProcess;
  if (processToStop) {
    try {
      processToStop.stdin?.write(JSON.stringify({ action: 'stop' }) + '\n');
    } catch (error) {
      console.error('[Python] Failed to send stop command:', getErrorMessage(error));
    }
    setTimeout(() => {
      if (pythonProcess === processToStop && !processToStop.killed) {
        processToStop.kill('SIGTERM');
      }
    }, 500);
    res.json({ status: 'stopping' });
  } else {
    res.json({ status: 'not_running' });
  }
});

app.post('/api/engine/command', (req, res) => {
  if (!pythonProcess || !pythonProcess.stdin) {
    return res.status(400).json({ error: 'Engine not running' });
  }
  const cmd = req.body;
  try {
    pythonProcess.stdin.write(JSON.stringify(cmd) + '\n');
  } catch (error) {
    console.error('[Python] Failed to send command:', getErrorMessage(error));
    return res.status(503).json({ error: 'Engine command could not be sent' });
  }
  res.json({ status: 'command_sent', cmd });
});

app.post('/api/benchmark/run', (req, res) => {
  const count = parsePositiveInteger(req.body?.count, 20000, MAX_BENCHMARK_COUNT);
  const benchScript = path.join(__dirname, 'chronosmatch', 'ipc_audit_benchmark.py');

  const proc = spawnPython([benchScript, String(count)], { cwd: __dirname });
  let output = '';
  let errOutput = '';
  
  proc.stdout?.on('data', (d) => { output += d.toString(); });
  proc.stderr?.on('data', (d) => { errOutput += d.toString(); });
  proc.once('error', (error) => {
    console.error('[Benchmark] Failed to start benchmark:', getErrorMessage(error));
    if (!res.headersSent) {
      res.status(500).json({ error: 'Benchmark could not be started' });
    }
  });

  proc.on('close', (code) => {
    if (res.headersSent) {
      return;
    }
    if (code !== 0) {
      return res.status(500).json({ error: 'Benchmark failed', details: errOutput.trim() || 'The benchmark process exited unsuccessfully.' });
    }
    try {
      const data = JSON.parse(output);
      res.json(data);
    } catch (error) {
      console.error('[Benchmark] Failed to parse output:', getErrorMessage(error));
      res.status(502).json({ error: 'Failed to parse benchmark output' });
    }
  });
});

app.get('/api/audit/trades', (req, res) => {
  const sqlite3Script = `
import sqlite3
import json
import os

db_path = ${JSON.stringify(path.join(runtimeDir, 'chronos_trades_audit.db'))}
if not os.path.exists(db_path):
    print(json.dumps([]))
    exit(0)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
try:
    cur.execute("SELECT trade_id, maker_order_id, taker_order_id, timestamp_ns, latency_ns, price_cents, quantity, flags, created_at FROM trades ORDER BY trade_id DESC LIMIT 100")
    rows = cur.fetchall()
    trades = []
    for r in rows:
        trades.append({
            "trade_id": r["trade_id"],
            "maker_order_id": r["maker_order_id"],
            "taker_order_id": r["taker_order_id"],
            "timestamp_ns": r["timestamp_ns"],
            "latency_us": round(r["latency_ns"] / 1000.0, 2),
            "price": round(r["price_cents"] / 100.0, 2),
            "quantity": r["quantity"],
            "is_whale": bool(r["flags"] & 1 or r["quantity"] >= 5000),
            "created_at": r["created_at"]
        })
    print(json.dumps(trades))
except Exception as e:
    print(str(e), file=sys.stderr)
    raise
finally:
    conn.close()
`;
  const proc = spawnPython(['-c', sqlite3Script], { cwd: __dirname });
  let out = '';
  proc.stdout?.on('data', (d) => { out += d.toString(); });
  proc.on('error', (error) => {
    console.error('[Audit] Failed to start audit query:', getErrorMessage(error));
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to query audit ledger' });
    }
  });
  proc.on('close', (code) => {
    if (code !== 0) {
      console.error('[Audit] Audit query exited with code:', code);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to query audit ledger' });
      }
      return;
    }
    try {
      res.json(JSON.parse(out));
    } catch (error) {
      console.error('[Audit] Failed to parse audit query output:', getErrorMessage(error));
      res.status(502).json({ error: 'Failed to parse audit ledger output' });
    }
  });
});

app.post('/api/gemini/chat', async (req, res) => {
  try {
    const {
      messages,
      model = 'gemini-3.8-flash',
      useSearch = true,
      systemInstruction
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: String(m.content || '') }]
    }));

    const config: any = {
      systemInstruction: systemInstruction || `You are Chronos AI, an elite Quantitative Analyst and Ultra-Low-Latency Systems Architect embedded within the ChronosMatch High-Frequency Trading Engine.
You specialize in:
- High-Frequency Trading (HFT) and sub-50 microsecond execution architectures.
- Limit Order Books (LOB), Price-Time Priority matching, FIFO queues, and queue position dynamics.
- Zero-copy shared memory IPC using POSIX mmap, lock-free ring buffers, cache-line padding, and atomic cursors.
- Hardware optimizations: CPU core pinning, isolcpus, hugepages, NUMA locality, and Solarflare OpenOnload kernel bypass.
- Market microstructure: liquidity sweeps, iceberg orders, institutional whale detection, spread dynamics, and earnings volatility.
- Up-to-date market intelligence, macro trends, and asset analysis using Google Search Grounding.

Deliver responses with mathematical precision, actionable trade/engineering insights, and citations when grounded search data is retrieved.`,
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    let response;
    let actualModel = model || 'gemini-3.8-flash';
    try {
      response = await getGeminiClient().models.generateContent({
        model: actualModel,
        contents,
        config
      });
    } catch (modelErr: any) {
      const errMsg = String(modelErr?.message || '');
      if (
        actualModel !== 'gemini-3.1-flash-lite' &&
        (errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('overloaded'))
      ) {
        console.warn(`[Gemini] ${actualModel} hit capacity or error (${errMsg}). Gracefully falling back to gemini-3.1-flash-lite`);
        actualModel = 'gemini-3.1-flash-lite';
        const fallbackConfig = { ...config };
        delete fallbackConfig.tools; // gemini-3.1-flash-lite does not support search tools
        response = await getGeminiClient().models.generateContent({
          model: actualModel,
          contents,
          config: fallbackConfig
        });
      } else {
        throw modelErr;
      }
    }

    let text = response.text || '';
    if (!text && response.candidates?.[0]?.content?.parts) {
      text = response.candidates[0].content.parts
        .map((p: any) => p.text || '')
        .filter(Boolean)
        .join('\n');
    }
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    res.json({
      text: text || 'Analysis completed with no text payload.',
      groundingChunks,
      model: actualModel
    });
  } catch (error: any) {
    console.error('Gemini API error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate response from Gemini API',
      details: String(error)
    });
  }
});

// RAG Knowledge Base Endpoints
app.get('/api/rag/documents', (req, res) => {
  try {
    const docs = getAllDocuments();
    res.json({
      total: docs.length,
      documents: docs,
      categories: ['SYSTEM_ARCHITECTURE', 'MARKET_MICROSTRUCTURE', 'QUANT_STRATEGIES', 'ANOMALIES_AND_RISK', 'USER_RULES']
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch RAG documents' });
  }
});

app.post('/api/rag/documents', (req, res) => {
  try {
    const { title, category, tags, content, sourceDoc } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    const created = addDocument({
      title,
      category: category || 'USER_RULES',
      tags: Array.isArray(tags) ? tags : ['CUSTOM'],
      content,
      sourceDoc: sourceDoc || 'User Ingestion Console'
    });
    res.json({ success: true, document: created });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to add RAG document' });
  }
});

app.post('/api/rag/query', async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      query,
      topK = 3,
      includeTelemetry = true,
      model = 'gemini-3.8-flash'
    } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query string is required' });
    }

    // 1. Semantic Retrieval across Knowledge Base
    const retrievals = searchKnowledgeBase(query, Math.min(6, Math.max(1, topK)));
    const retrievalLatencyMs = Date.now() - startTime;

    // 2. Augment context with retrieved chunks and real-time engine telemetry
    const ragContext = buildRAGContext(
      retrievals,
      includeTelemetry ? latestTelemetry : undefined
    );

    const systemInstruction = `You are Chronos Quant RAG, the specialized Retrieval-Augmented Intelligence Engine for the ChronosMatch High-Frequency Trading platform.
You are grounded in proprietary low-latency systems architecture, market microstructure physics, limit order book mathematics, and live telemetry.

GROUNDING RULES:
1. Always base your response directly on the provided [RETRIEVED QUANT KNOWLEDGE BASE DOCUMENTS] and [LIVE HFT ENGINE TELEMETRY SNAPSHOT].
2. Cite the retrieved source document titles specifically (e.g. "[Source: Zero-Copy POSIX Shared Memory Ring Buffer Architecture]").
3. When discussing telemetry, refer explicitly to the live numbers provided (such as live spread, top bid/ask, and microsecond latencies).
4. Provide structured, authoritative, mathematically grounded explanations with code or formula snippets when relevant.`;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `${ragContext}\n\nUSER INQUIRY:\n${query}\n\nPlease synthesize a comprehensive, grounded quantitative response with explicit citations to the retrieved sources above.`
          }
        ]
      }
    ];

    let response;
    let actualModel = model || 'gemini-3.8-flash';
    try {
      response = await getGeminiClient().models.generateContent({
        model: actualModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });
    } catch (modelErr: any) {
      console.warn(`[RAG Gemini] Fallback to gemini-3.1-flash-lite due to:`, modelErr?.message);
      actualModel = 'gemini-3.1-flash-lite';
      response = await getGeminiClient().models.generateContent({
        model: actualModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });
    }

    let answer = response.text || '';
    if (!answer && response.candidates?.[0]?.content?.parts) {
      answer = response.candidates[0].content.parts
        .map((p: any) => p.text || '')
        .filter(Boolean)
        .join('\n');
    }

    const totalLatencyMs = Date.now() - startTime;

    res.json({
      answer: answer || 'RAG synthesis completed with no text payload.',
      retrievedChunks: retrievals.map(r => ({
        id: r.doc.id,
        title: r.doc.title,
        category: r.doc.category,
        relevanceScore: r.score,
        relevancePct: Math.round(r.score * 100),
        matchedSnippet: r.matchedSnippet,
        sourceDoc: r.doc.sourceDoc,
        tags: r.doc.tags
      })),
      telemetryIncluded: includeTelemetry && !!latestTelemetry,
      retrievalLatencyMs,
      totalLatencyMs,
      model: actualModel
    });
  } catch (error: any) {
    console.error('RAG Query API error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to execute RAG query',
      details: String(error)
    });
  }
});

app.get('/api/source-code', (req, res) => {
  const files = [
    { name: 'chronos_types.py', path: 'chronosmatch/chronos_types.py', desc: 'Binary C-Struct definitions (32-byte Order, 56-byte Trade, 64-byte Header)' },
    { name: 'chronos_ring_buffer.py', path: 'chronosmatch/chronos_ring_buffer.py', desc: 'Lock-Free POSIX Memory-Mapped circular buffer with zero serialization' },
    { name: 'chronos_engine.pyx', path: 'chronosmatch/chronos_engine.pyx', desc: 'Cython C-extension LOB with arena allocation, nogil matching & C-struct pointers' },
    { name: 'setup.py', path: 'chronosmatch/setup.py', desc: 'Cython compilation configuration with GCC -O3 and -march=native flags' },
    { name: 'engine_pure.py', path: 'chronosmatch/engine_pure.py', desc: 'Zero-Copy Price-Time Priority LOB with nanosecond latency tracking' },
    { name: 'market_firehose.py', path: 'chronosmatch/market_firehose.py', desc: 'Asyncio mock order generator pumping 100,000+ orders/second' },
    { name: 'latency_monitor_curses.py', path: 'chronosmatch/latency_monitor_curses.py', desc: 'Python curses terminal TUI displaying real-time depth & whale alerts' },
    { name: 'trade_audit_ledger.py', path: 'chronosmatch/trade_audit_ledger.py', desc: 'Asynchronous SQLite WAL persistence ledger for regulatory auditability' },
    { name: 'ipc_audit_benchmark.py', path: 'chronosmatch/ipc_audit_benchmark.py', desc: 'Zero-copy vs Pickle vs JSON benchmark suite with GC metrics' },
    { name: 'low_latency_tuning.sh', path: 'chronosmatch/low_latency_tuning.sh', desc: 'Bare-metal Linux kernel tuning script (CPU isolation, hugepages, sysctl)' },
    { name: 'tuning_guide.md', path: 'chronosmatch/tuning_guide.md', desc: 'Low-latency systems architecture documentation & deployment manual' },
    { name: 'firestore.rules', path: 'firestore.rules', desc: 'Zero-Trust ABAC security rules for Firestore cloud trade vault and watchlists' },
    { name: 'firebase-blueprint.json', path: 'firebase-blueprint.json', desc: 'Intermediate representation JSON schema for cloud models' }
  ];

  const sourceFiles = files.map(f => {
    const fullPath = path.join(__dirname, f.path);
    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch (error) {
      console.error(`[Source] Failed to read ${f.path}:`, getErrorMessage(error));
      content = `# File not found: ${f.path}`;
    }
    return {
      name: f.name,
      path: f.path,
      description: f.desc,
      content
    };
  });

  res.json(sourceFiles);
});

// SSE Streaming Route
app.get('/api/engine/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write('\n');
  sseClients.add(res);
  res.on('error', (error) => {
    console.error('[SSE] Client connection error:', getErrorMessage(error));
    sseClients.delete(res);
  });

  if (latestTelemetry) {
    res.write(`event: telemetry\ndata: ${JSON.stringify(latestTelemetry)}\n\n`);
  }

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Setup Vite or static serving
async function setupServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: { server } },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  listenOnAvailablePort(PORT);
}

setupServer().catch((error) => {
  console.error('[Server] Failed to initialize:', getErrorMessage(error));
  process.exitCode = 1;
});
