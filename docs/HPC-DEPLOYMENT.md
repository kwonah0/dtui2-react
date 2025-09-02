# DTUI2 HPC Environment Deployment Guide

## Overview
This guide explains how to deploy and run DTUI2 in High-Performance Computing (HPC) environments, specifically addressing challenges in RedHat 8, NFS filesystems, and environments with shared memory restrictions.

## Quick Start

1. **Run HPC Setup**:
   ```bash
   ./scripts/hpc-setup.sh
   ```

2. **Test Environment**:
   ```bash
   ./test-hpc-env.sh
   ```

3. **Build for HPC**:
   ```bash
   npm run dist:linux
   ```

4. **Launch with HPC Settings**:
   ```bash
   ./dtui2-hpc.sh
   ```

## HPC Environment Challenges

### 1. Shared Memory Limitations
**Problem**: Many HPC systems restrict `/dev/shm` access or have very limited shared memory.
**Solution**: DTUI2 can disable Chromium's shared memory usage with `--disable-dev-shm-usage` flag.

### 2. SELinux Enforcing Mode
**Problem**: SELinux policies may prevent Electron/Chromium execution.
**Solutions**:
- Use `--no-sandbox` and `--disable-setuid-sandbox` flags
- Disable GPU acceleration with `--disable-gpu`
- Use software rendering with `LIBGL_ALWAYS_SOFTWARE=1`

### 3. NFS Filesystem Permissions
**Problem**: NFS mounts may have restricted permissions for executable files.
**Solution**: Use AppImage format which handles these restrictions automatically.

### 4. Job Scheduler Environments
**Problem**: PBS, SLURM, or LSF environments may have additional restrictions.
**Solution**: Automatic detection and appropriate flag configuration.

## Configuration

### HPC-Specific Configuration
DTUI2 supports HPC-specific configuration in the `hpc` section:

```json
{
  "hpc": {
    "disableGpu": true,
    "disableShm": true,
    "disableDevShmUsage": true,
    "noSandbox": true,
    "disableSetuidSandbox": true,
    "singleProcess": false,
    "disableFeatures": "VizDisplayCompositor,WebRtc,WebBluetooth"
  }
}
```

### Environment Variables
Override HPC settings using environment variables:

```bash
# Disable GPU acceleration
export DTUI_CFG__hpc__disableGpu=true

# Disable sandbox
export DTUI_CFG__hpc__noSandbox=true

# Use custom config file
export DTUI_USER_CONFIGFILE=/path/to/dtui-hpc.json
```

### Chromium Flags
DTUI2 automatically applies these Chromium flags in HPC mode:

- `--no-sandbox`: Disable sandboxing
- `--disable-setuid-sandbox`: Disable setuid sandbox  
- `--disable-gpu`: Disable hardware acceleration
- `--disable-dev-shm-usage`: Don't use /dev/shm
- `--disable-software-rasterizer`: Disable software rasterizer
- `--disable-features=VizDisplayCompositor,WebRtc,WebBluetooth`: Disable problematic features
- `--memory-pressure-off`: Disable memory pressure handling
- `--single-process=false`: Use multi-process (more stable than single-process)

## Deployment Steps

### 1. Prepare Environment
```bash
# Check current environment
./test-hpc-env.sh

# Review output for potential issues
```

### 2. Configure for HPC
```bash
# Run setup script
./scripts/hpc-setup.sh

# This creates:
# - dtui-hpc.json (HPC-optimized config)
# - dtui2-hpc.sh (HPC launcher script)
# - test-hpc-env.sh (environment tester)
```

### 3. Build AppImage
```bash
# Build the application
npm run build

# Create AppImage (Linux)
npm run dist:linux

# The AppImage will be in ./release/
```

### 4. Deploy to HPC System
```bash
# Copy files to HPC system
scp release/DTUI2-*.AppImage user@hpc-system:/path/to/deployment/
scp dtui-hpc.json dtui2-hpc.sh user@hpc-system:/path/to/deployment/

# Make executable on HPC system
chmod +x DTUI2-*.AppImage dtui2-hpc.sh
```

### 5. Launch on HPC
```bash
# Option 1: Use HPC launcher script
./dtui2-hpc.sh

# Option 2: Direct launch with custom config
export DTUI_USER_CONFIGFILE=./dtui-hpc.json
./DTUI2-*.AppImage

# Option 3: Environment variable configuration
export DTUI_CFG__hpc__disableGpu=true
export DTUI_CFG__hpc__noSandbox=true
./DTUI2-*.AppImage
```

## Troubleshooting

### Common Issues

#### 1. "GPU process isn't usable" Error
```bash
# Solution: Force software rendering
export LIBGL_ALWAYS_SOFTWARE=1
export DTUI_CFG__hpc__disableGpu=true
```

#### 2. "Failed to create /dev/shm/ files" Error
```bash
# Solution: Disable shared memory usage
export DTUI_CFG__hpc__disableDevShmUsage=true
```

#### 3. SELinux Permission Denied
```bash
# Check SELinux status
getenforce

# If enforcing, use no-sandbox mode
export DTUI_CFG__hpc__noSandbox=true
```

#### 4. NFS Permission Issues
```bash
# Use AppImage format (handles NFS better)
# Or copy to local temp directory:
cp DTUI2.AppImage $TMPDIR/
$TMPDIR/DTUI2.AppImage
```

#### 5. X11 Display Issues
```bash
# Ensure DISPLAY is set
echo $DISPLAY

# Test X11 connection
xdpyinfo

# If X11 forwarding over SSH:
ssh -X user@hpc-system
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Enable Electron logging
export ELECTRON_ENABLE_LOGGING=1
export ELECTRON_LOG_FILE=./dtui2-debug.log

# Launch and check log
./dtui2-hpc.sh
tail -f dtui2-debug.log
```

### Performance Optimization

For HPC environments, consider these optimizations:

```json
{
  "hpc": {
    "disableGpu": true,
    "disableFeatures": "VizDisplayCompositor,TranslateUI,WebRtc,WebBluetooth,MediaRouter",
    "memoryPressureOff": true
  },
  "ai": {
    "shell": {
      "timeout": 30000
    }
  }
}
```

## Job Scheduler Integration

### PBS/Torque
```bash
#!/bin/bash
#PBS -N dtui2-job
#PBS -l nodes=1:ppn=1
#PBS -l walltime=01:00:00

cd $PBS_O_WORKDIR
export DTUI_USER_CONFIGFILE=$PWD/dtui-hpc.json
./dtui2-hpc.sh
```

### SLURM
```bash
#!/bin/bash
#SBATCH --job-name=dtui2
#SBATCH --nodes=1
#SBATCH --time=01:00:00

export DTUI_USER_CONFIGFILE=$PWD/dtui-hpc.json
./dtui2-hpc.sh
```

### LSF
```bash
#!/bin/bash
#BSUB -J dtui2
#BSUB -n 1
#BSUB -W 01:00

export DTUI_USER_CONFIGFILE=$PWD/dtui-hpc.json
./dtui2-hpc.sh
```

## Security Considerations

In HPC environments, DTUI2 runs with reduced security features:

1. **Sandboxing Disabled**: Required for compatibility but reduces security isolation
2. **GPU Disabled**: Prevents GPU-related security issues
3. **Reduced Feature Set**: Disables potentially problematic web features
4. **Local Execution Only**: Shell commands run locally, respecting job scheduler limits

## Testing

### Automated Testing
```bash
# Run HPC-specific tests
npm run test:hpc

# Test configuration system
npm run test:config

# Test GUI with HPC settings
DTUI_USER_CONFIGFILE=dtui-hpc.json npm run test:gui
```

### Manual Testing Checklist
- [ ] Application starts without errors
- [ ] Configuration loads correctly
- [ ] Shell commands execute properly  
- [ ] Output formatting works
- [ ] No GPU-related errors in logs
- [ ] Memory usage stays reasonable
- [ ] Application responds to user input

## Support

For HPC-specific issues:

1. Run `./test-hpc-env.sh` and include output
2. Check `dtui2-debug.log` for errors
3. Verify configuration with `cat $DTUI_USER_CONFIGFILE`
4. Test basic functionality with minimal config

## References

- [Electron Command Line Switches](https://www.electronjs.org/docs/latest/api/command-line-switches)
- [Chromium Command Line Switches](https://peter.sh/experiments/chromium-command-line-switches/)
- [AppImage Documentation](https://docs.appimage.org/)
- [SELinux and Electron](https://github.com/electron/electron/issues/17972)