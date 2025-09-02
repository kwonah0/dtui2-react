#!/bin/bash

# Test HPC Environment Compatibility

echo "=== DTUI2 HPC Environment Test ==="
echo

# System Information
echo "System Information:"
echo "  OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2 2>/dev/null || uname -s)"
echo "  Kernel: $(uname -r)"
echo "  Architecture: $(uname -m)"
echo

# Check job schedulers
echo "Job Scheduler Environment:"
for var in PBS_JOBID SLURM_JOB_ID LSB_JOBID; do
    if [ -n "${!var}" ]; then
        echo "  $var: ${!var}"
    fi
done
echo

# Check filesystem types
echo "Filesystem Information:"
df -T . | tail -1 | awk '{print "  Current directory: " $1 " (" $2 ")"}'
mount | grep -E "(nfs|lustre|gpfs)" | head -5 | while read line; do
    echo "  $line"
done
echo

# Check permissions
echo "Permission Tests:"
echo -n "  /tmp writable: "
if [ -w /tmp ]; then echo "YES"; else echo "NO"; fi

echo -n "  /dev/shm writable: "
if [ -w /dev/shm ]; then echo "YES"; else echo "NO"; fi

echo -n "  Current directory writable: "
if [ -w . ]; then echo "YES"; else echo "NO"; fi

echo -n "  Can create temp files: "
if touch /tmp/dtui2-test.$$ 2>/dev/null; then
    echo "YES"
    rm -f /tmp/dtui2-test.$$
else
    echo "NO"
fi
echo

# Check SELinux
echo "SELinux Status:"
if command -v getenforce >/dev/null 2>&1; then
    echo "  Status: $(getenforce 2>/dev/null || echo 'Unknown')"
    if command -v getsebool >/dev/null 2>&1; then
        for bool in allow_execstack allow_execmem; do
            status=$(getsebool $bool 2>/dev/null | cut -d' ' -f3 || echo "unknown")
            echo "  $bool: $status"
        done
    fi
else
    echo "  SELinux not detected"
fi
echo

# Check graphics
echo "Graphics Information:"
echo -n "  DISPLAY: "
if [ -n "$DISPLAY" ]; then echo "$DISPLAY"; else echo "Not set"; fi

echo -n "  X11 available: "
if xdpyinfo >/dev/null 2>&1; then echo "YES"; else echo "NO"; fi

echo -n "  Hardware acceleration: "
if [ "$LIBGL_ALWAYS_SOFTWARE" = "1" ]; then
    echo "Disabled (software rendering)"
else
    echo "Enabled"
fi
echo

# Memory information
echo "Memory Information:"
free -h | head -2
echo

echo "=== Test Complete ==="
