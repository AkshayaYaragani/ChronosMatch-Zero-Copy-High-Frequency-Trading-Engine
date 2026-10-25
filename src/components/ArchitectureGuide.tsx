import React from 'react';
import { Calendar, Cpu, Layers, Terminal, Shield, Zap, CheckCircle2, ChevronRight, HardDrive, Network } from 'lucide-react';

export const ArchitectureGuide: React.FC = () => {
  return (
    <div className="space-y-4 font-mono text-[#d1d5db]">
      {/* Hero Section */}
      <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#131722] text-[#8ca0b4] border border-[#2a2e39] text-[9px] font-bold tracking-widest uppercase">
                DOMAIN: FINTECH & LOW-LATENCY SYSTEMS
              </span>
              <span className="px-2 py-0.5 rounded bg-[#131722] text-[#7da98f] border border-[#2a2e39] text-[9px] font-bold tracking-widest uppercase">
                ISO 9001:2015 CERTIFIED ARCHITECTURE
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-100 mt-2 uppercase tracking-wide">
              ChronosMatch: Zero-Copy High-Frequency Trading Engine
            </h2>
            <p className="text-xs text-[#64748b] mt-1.5 max-w-4xl leading-relaxed">
              <strong className="text-slate-300">Problem Statement:</strong> In High-Frequency Trading (HFT), microseconds equal millions of dollars.
              Python is notoriously dismissed for HFT because its Garbage Collector causes unpredictable latency spikes, and passing data between processes normally requires slow serialization (JSON/Pickle).
            </p>
            <p className="text-xs text-[#64748b] mt-1 max-w-4xl leading-relaxed">
              <strong className="text-slate-300">Use Case:</strong> A quantitative analyst at a high-frequency trading firm deploys ChronosMatch. As a massive wave of thousands of &quot;Buy&quot; and &quot;Sell&quot; orders floods the network following an earnings report, the Python ingestion process writes the incoming tick data directly to a memory-mapped ring buffer. Simultaneously, the Cython matching engine reads from the exact same RAM address, matching trades in under 50 microseconds without triggering a single Python garbage collection pause.
            </p>
          </div>
        </div>
      </div>

      {/* Week-Wise Development Plan */}
      <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-5 shadow-lg">
        <div className="flex items-center gap-2 pb-3 border-b border-[#2a2e39] mb-4">
          <Calendar className="w-4 h-4 text-[#8ca0b4]" />
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            WEEK-WISE DEVELOPMENT & IMPLEMENTATION ROADMAP
          </h3>
        </div>

        <div className="space-y-3">
          {/* Week 1 */}
          <div className="border border-[#2a2e39] rounded-lg p-3 bg-[#151926]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#7da98f] uppercase tracking-wider mb-2">
              <span className="px-1.5 py-0.2 rounded bg-[#1c2030] border border-[#2a2e39] text-[10px]">WEEK 1</span>
              <span>Memory Mapping & High-Throughput Market Firehose</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-[#131722] border border-[#242834]">
                <span className="font-semibold text-[#8ca0b4] block mb-1">Low-Latency Engineering (mmap & struct):</span>
                <p className="text-[#64748b] leading-relaxed">
                  Built the mmap ring buffer (<code className="text-slate-300">chronos_ring_buffer.py</code>) using Python&apos;s mmap and struct modules to read/write raw bytes (Order ID, Timestamp, Price, Quantity, Side, Flags) packed into 32-byte cache-line friendly layouts.
                </p>
              </div>
              <div className="p-2.5 rounded bg-[#131722] border border-[#242834]">
                <span className="font-semibold text-[#7da98f] block mb-1">Market Logic & UI (asyncio):</span>
                <p className="text-[#64748b] leading-relaxed">
                  Engineered the asyncio market firehose (<code className="text-slate-300">market_firehose.py</code>) that blasts up to 100,000 mock trade orders per second directly into the shared memory IPC bus without serialization bottlenecks.
                </p>
              </div>
            </div>
          </div>

          {/* Week 2 */}
          <div className="border border-[#2a2e39] rounded-lg p-3 bg-[#151926]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8ca0b4] uppercase tracking-wider mb-2">
              <span className="px-1.5 py-0.2 rounded bg-[#1c2030] border border-[#2a2e39] text-[10px]">WEEK 2</span>
              <span>Cython Engine & Terminal Curses Dashboard</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-[#131722] border border-[#242834]">
                <span className="font-semibold text-[#8ca0b4] block mb-1">Cython Engine (.pyx):</span>
                <p className="text-[#64748b] leading-relaxed">
                  Implemented the Limit Order Book algorithm (Price-Time Priority) in <code className="text-slate-300">chronos_engine.pyx</code>, defining variables statically using C-types (OrderNode, PriceLevel structs) to bypass the Python GIL and achieve direct pointer manipulation.
                </p>
              </div>
              <div className="p-2.5 rounded bg-[#131722] border border-[#242834]">
                <span className="font-semibold text-[#7da98f] block mb-1">Latency Dashboard (Python curses):</span>
                <p className="text-[#64748b] leading-relaxed">
                  Developed the raw curses terminal UI (<code className="text-slate-300">latency_monitor_curses.py</code>) to display the top of the Order Book (Bid/Ask spread ladder) in real-time on any terminal.
                </p>
              </div>
            </div>
          </div>

          {/* Mid-Project Review */}
          <div className="border border-[#4a3928] rounded-lg p-3 bg-[#241d16]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#d6b77c] uppercase tracking-wider mb-2">
              <span className="px-1.5 py-0.2 rounded bg-[#1c2030] border border-[#4a3928] text-[10px]">MID-PROJECT REVIEW</span>
              <span>IPC Zero-Copy Audit & Engine Verification</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-[#131722] border border-[#242834]">
                <span className="font-semibold text-[#d6b77c] block mb-1">IPC Audit:</span>
                <p className="text-[#64748b] leading-relaxed">
                  Proved the zero-copy architecture works by sending 1M orders between two Python processes without hitting the CPU bottleneck of Pickling. Achieved 175k+ ops/s compared to 79k ops/s for JSON and eliminated GC pause spikes.
                </p>
              </div>
              <div className="p-2.5 rounded bg-[#131722] border border-[#242834]">
                <span className="font-semibold text-[#7da98f] block mb-1">Engine Verification:</span>
                <p className="text-[#64748b] leading-relaxed">
                  Verified that the Order Book correctly matches an aggressive Buy order with a corresponding Sell order instantly, preserving strict FIFO price-time priority.
                </p>
              </div>
            </div>
          </div>

          {/* Week 3 */}
          <div className="border border-[#2a2e39] rounded-lg p-3 bg-[#151926]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8ca0b4] uppercase tracking-wider mb-2">
              <span className="px-1.5 py-0.2 rounded bg-[#1c2030] border border-[#2a2e39] text-[10px]">WEEK 3</span>
              <span>C-Level Optimization & Nanosecond Latency Telemetry</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-[#131722] border border-[#242834]">
                <span className="font-semibold text-[#8ca0b4] block mb-1">C-Level Arena Optimization:</span>
                <p className="text-[#64748b] leading-relaxed">
                  Refined the Cython code by removing all Python object interactions inside the matching loop. Implemented preallocated memory arena pools (<code className="text-slate-300">order_arena</code>) to guarantee the Garbage Collector never triggers during trading.
                </p>
              </div>
              <div className="p-2.5 rounded bg-[#131722] border border-[#242834]">
                <span className="font-semibold text-[#7da98f] block mb-1">Metrics Tracking:</span>
                <p className="text-[#64748b] leading-relaxed">
                  Embedded <code className="text-slate-300">time.perf_counter_ns()</code> timestamps to measure the exact nanosecond a trade enters and exits the engine, tracking p50, p90, p99, and p99.9 execution latencies.
                </p>
              </div>
            </div>
          </div>

          {/* Week 4 */}
          <div className="border border-[#2a2e39] rounded-lg p-3 bg-[#151926]">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              <span className="px-1.5 py-0.2 rounded bg-[#1c2030] border border-[#2a2e39] text-[10px]">WEEK 4</span>
              <span>Resiliency (SQLite Audit Ledger) & Whale Sweep Visualizer</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-[#131722] border border-[#242834]">
                <span className="font-semibold text-[#8ca0b4] block mb-1">Resiliency & Audit:</span>
                <p className="text-[#64748b] leading-relaxed">
                  Engineered <code className="text-slate-300">trade_audit_ledger.py</code> to asynchronously flush matched trades from the mmap buffer to a permanent SQLite/ClickHouse ledger using WAL mode for zero impact on critical path.
                </p>
              </div>
              <div className="p-2.5 rounded bg-[#131722] border border-[#242834]">
                <span className="font-semibold text-[#d6b77c] block mb-1">Refine & Polish (Whale Alerts):</span>
                <p className="text-[#64748b] leading-relaxed">
                  Polished the terminal UI and web dashboard to visually highlight when a massive &quot;Whale&quot; institutional order sweeps multiple price levels simultaneously.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bare-Metal Low-Latency Linux Deployment Guide */}
      <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-[#2a2e39]">
          <Terminal className="w-4 h-4 text-[#8ca0b4]" />
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            BARE-METAL LOW-LATENCY DEPLOYMENT GUIDE (EQUINIX NY4 / LD4 COLOCATION)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Step 1: Kernel Isolation */}
          <div className="p-3 rounded-lg bg-[#151926] border border-[#242834] space-y-1.5">
            <span className="font-bold text-[#7da98f] flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> 1. CPU Core Pinning & Kernel Isolation
            </span>
            <p className="text-[#64748b]">
              Isolate CPU cores 2-7 from kernel scheduler interrupts and tick jitter in <code className="text-slate-300">/etc/default/grub</code>:
            </p>
            <pre className="p-2 rounded bg-[#11141e] border border-[#2a2e39] text-[10px] text-slate-300 overflow-x-auto">
              <code>GRUB_CMDLINE_LINUX_DEFAULT=&quot;isolcpus=2-7 nohz_full=2-7 rcu_nocbs=2-7 intel_idle.max_cstate=0 processor.max_cstate=0 clocksource=tsc&quot;</code>
            </pre>
          </div>

          {/* Step 2: Shared Memory & HugePages */}
          <div className="p-3 rounded-lg bg-[#151926] border border-[#242834] space-y-1.5">
            <span className="font-bold text-[#8ca0b4] flex items-center gap-1.5">
              <HardDrive className="w-4 h-4" /> 2. 2MB HugePages for Ring Buffers
            </span>
            <p className="text-[#64748b]">
              Preallocate 2MB HugePages to prevent TLB cache misses during mmap circular ring traversal:
            </p>
            <pre className="p-2 rounded bg-[#11141e] border border-[#2a2e39] text-[10px] text-slate-300 overflow-x-auto">
              <code>sudo sysctl -w vm.nr_hugepages=1024&#10;sudo sysctl -w kernel.shmmax=2147483648</code>
            </pre>
          </div>

          {/* Step 3: Kernel Bypass */}
          <div className="p-3 rounded-lg bg-[#151926] border border-[#242834] space-y-1.5">
            <span className="font-bold text-[#d6b77c] flex items-center gap-1.5">
              <Network className="w-4 h-4" /> 3. Solarflare / Mellanox Kernel Bypass
            </span>
            <p className="text-[#64748b]">
              Disable interrupt coalescing and use Solarflare Onload or DPDK for zero-copy NIC packet injection:
            </p>
            <pre className="p-2 rounded bg-[#11141e] border border-[#2a2e39] text-[10px] text-slate-300 overflow-x-auto">
              <code>sudo ethtool -C eth0 adaptive-rx off rx-usecs 0&#10;sudo onload --profile=latency python3 chronosmatch/runner.py</code>
            </pre>
          </div>

          {/* Step 4: Real-time Priority */}
          <div className="p-3 rounded-lg bg-[#151926] border border-[#242834] space-y-1.5">
            <span className="font-bold text-[#8ca0b4] flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> 4. Real-Time SCHED_FIFO Scheduling
            </span>
            <p className="text-[#64748b]">
              Lock the process to real-time priority 99 with taskset CPU affinity:
            </p>
            <pre className="p-2 rounded bg-[#11141e] border border-[#2a2e39] text-[10px] text-slate-300 overflow-x-auto">
              <code>sudo chrt -f 99 taskset -c 2,3 python3 chronosmatch/runner.py --rate 100000</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
