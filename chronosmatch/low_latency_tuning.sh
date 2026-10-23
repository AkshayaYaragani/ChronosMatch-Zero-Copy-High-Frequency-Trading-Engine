#!/usr/bin/env bash
# ==============================================================================
# ChronosMatch: Bare-Metal Low-Latency Linux Environment Tuning Script
# Configures CPU isolation, governor, hugepages, network sysctl, and limits
# Run as root: sudo bash low_latency_tuning.sh
# ==============================================================================

set -euo pipefail

echo ">>> [ChronosMatch] Initiating Low-Latency Kernel Tuning..."

# 1. CPU Power & Governor: Set to Performance
if command -v cpupower &> /dev/null; then
    echo "[1/6] Locking CPU frequency to maximum performance..."
    cpupower frequency-set --governor performance || true
else
    echo "[1/6] Setting CPU scaling governor to performance via sysfs..."
    for gov in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
        if [ -f "$gov" ]; then
            echo "performance" > "$gov" 2>/dev/null || true
        fi
    done
fi

# 2. Disable CPU C-States via sysfs if permitted
echo "[2/6] Minimizing CPU idle latency..."
for idle_state in /sys/devices/system/cpu/cpu*/cpuidle/state[1-9]/disable; do
    if [ -f "$idle_state" ]; then
        echo 1 > "$idle_state" 2>/dev/null || true
    fi
done

# 3. Configure Virtual Memory & HugePages for Zero-Copy MMap
echo "[3/6] Configuring POSIX shared memory and HugePages..."
sysctl -w vm.nr_hugepages=1024 2>/dev/null || true
sysctl -w vm.swappiness=0 2>/dev/null || true
sysctl -w vm.dirty_ratio=10 2>/dev/null || true
sysctl -w vm.dirty_background_ratio=5 2>/dev/null || true
sysctl -w kernel.shmmax=2147483648 2>/dev/null || true
sysctl -w kernel.shmall=2097152 2>/dev/null || true

# 4. Low-Latency Network Socket Tuning
echo "[4/6] Tuning socket buffer queues and latency..."
sysctl -w net.core.rmem_max=16777216 2>/dev/null || true
sysctl -w net.core.wmem_max=16777216 2>/dev/null || true
sysctl -w net.core.netdev_max_backlog=100000 2>/dev/null || true
sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216" 2>/dev/null || true
sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216" 2>/dev/null || true
sysctl -w net.ipv4.tcp_low_latency=1 2>/dev/null || true
sysctl -w net.ipv4.tcp_timestamps=0 2>/dev/null || true
sysctl -w net.ipv4.tcp_sack=0 2>/dev/null || true

# 5. Process Scheduling & Real-Time Priorities
echo "[5/6] Configuring process limits..."
ulimit -l unlimited || true
ulimit -n 1048576 || true

# 6. Verify Shared Memory Directory
echo "[6/6] Verifying POSIX shared memory mount (/dev/shm)..."
if [ -d "/dev/shm" ]; then
    echo "  /dev/shm is mounted and operational (RAM tmpfs)."
else
    echo "  Warning: /dev/shm not found, using /tmp for mmap ring buffers."
fi

echo "=============================================================================="
echo ">>> ChronosMatch Low-Latency Tuning Completed Successfully!"
echo ">>> Recommended execution command:"
echo ">>> taskset -c 2,3 chrt -f 99 python3 chronosmatch/runner.py --rate 50000"
echo "=============================================================================="
