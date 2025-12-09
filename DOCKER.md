# 🐳 Docker Deployment Guide

This guide explains how to run the **Starknet Privacy Toolkit** using Docker, ensuring a consistent environment across all development machines without dependency conflicts.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

---

## Prerequisites

### Required Software

1. **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
   - Version 20.10 or higher
   - Download: https://www.docker.com/products/docker-desktop

2. **Docker Compose**
   - Version 2.0 or higher
   - Included with Docker Desktop
   - Linux: `sudo apt-get install docker-compose-plugin`

### System Requirements

- **RAM**: Minimum 8GB (16GB recommended for ZK proof generation)
- **Disk Space**: At least 10GB free
- **CPU**: Multi-core processor (ZK operations are CPU-intensive)

### Verify Installation

```bash
docker --version
# Docker version 24.0.0 or higher

docker-compose --version
# Docker Compose version v2.20.0 or higher
```

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/omarespejel/tongo-ukraine-donations.git
cd starknet-privacy-toolkit
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Windows: notepad .env
# Linux/Mac: nano .env
```

**Required environment variables:**
```env
STARKNET_RPC_URL=https://sepolia.starknet.io/rpc/v0_8_1
TONGO_CONTRACT_ADDRESS=0x00b4cca30f0f641e01140c1c388f55641f1c3fe5515484e622b6cb91d8cee585
STRK_ADDRESS=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
```

### 3. Build and Start

**Windows (PowerShell):**
```powershell
.\docker-helper.ps1 build
.\docker-helper.ps1 start
```

**Linux/Mac:**
```bash
chmod +x docker-helper.sh
./docker-helper.sh build
./docker-helper.sh start
```

**Or manually:**
```bash
docker-compose build
docker-compose up -d
```

### 4. Access the Application

- **Web UI**: http://localhost:8080
- **API Server**: http://localhost:3001
- **Health Check**: http://localhost:8080/

---

## Architecture

### Docker Image Layers

The Dockerfile uses a **multi-stage build** to optimize image size and build time:

```
┌─────────────────────────────────────┐
│  Stage 1: Base Ubuntu 22.04         │
│  - System dependencies              │
│  - Python 3.10                      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Stage 2: Bun Runtime               │
│  - Bun installation                 │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Stage 3: Rust & Cargo              │
│  - Rust toolchain                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Stage 4: Noir (nargo)              │
│  - Version 1.0.0-beta.1             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Stage 5: Barretenberg (bb)         │
│  - Version 0.67.0                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Stage 6: Garaga                    │
│  - Version 0.15.5                   │
│  - Python virtual environment       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Stage 7: Scarb (Cairo)             │
│  - Version 2.9.2                    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Stage 8: Starknet Foundry          │
│  - sncast, snforge                  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Final Stage: Application           │
│  - Application code                 │
│  - Built artifacts                  │
│  - Runtime configuration            │
└─────────────────────────────────────┘
```

### Included Tools & Versions

| Tool | Version | Purpose |
|------|---------|---------|
| **Bun** | Latest | JavaScript/TypeScript runtime |
| **Node.js** | Via Bun | Package management |
| **Noir (nargo)** | 1.0.0-beta.1 | ZK circuit compilation |
| **Barretenberg (bb)** | 0.67.0 | ZK proof generation |
| **Garaga** | 0.15.5 | Cairo verifier generation |
| **Scarb** | 2.9.2 | Cairo build tool |
| **Starknet Foundry** | Latest | Contract deployment (sncast/snforge) |
| **Python** | 3.10 | Garaga dependency |
| **Rust** | Latest stable | Noir/bb dependency |

---

## Configuration

### Environment Variables

Create a `.env` file from `.env.example`:

```env
# Starknet RPC Configuration
STARKNET_RPC_URL=https://sepolia.starknet.io/rpc/v0_8_1

# Contract Addresses (Sepolia Testnet)
TONGO_CONTRACT_ADDRESS=0x00b4cca30f0f641e01140c1c388f55641f1c3fe5515484e622b6cb91d8cee585
STRK_ADDRESS=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d

# Optional: Your Starknet Account (for CLI operations)
STARKNET_ACCOUNT_ADDRESS=your_account_address_here
STARKNET_PRIVATE_KEY=your_private_key_here

# Optional: Tongo Private Key (auto-generated if not provided)
TONGO_PRIVATE_KEY=
```

### Volume Mounts

The `docker-compose.yml` mounts the following directories for development:

- `./src` → `/app/src` - Application source code
- `./api` → `/app/api` - API server code
- `./zk-badges` → `/app/zk-badges` - ZK circuits
- `./donation_badge_verifier` → `/app/donation_badge_verifier` - Cairo contracts
- `./.env` → `/app/.env` - Environment configuration

### Persistent Volumes

Named volumes preserve data across container restarts:

- `node_modules` - NPM dependencies
- `dist` - Build artifacts
- `zk_target` - Compiled ZK circuits
- `cairo_target` - Compiled Cairo contracts

---

## Usage

### Helper Scripts

We provide helper scripts for common operations:

#### Windows (PowerShell)

```powershell
# Build image
.\docker-helper.ps1 build

# Start services
.\docker-helper.ps1 start

# View logs
.\docker-helper.ps1 logs

# Stop services
.\docker-helper.ps1 stop

# Open shell
.\docker-helper.ps1 shell

# Run tests
.\docker-helper.ps1 test

# Generate proof
.\docker-helper.ps1 proof --amount 1000 --threshold 1000 --donor-secret hunter2 --tier 1
```

#### Linux/Mac (Bash)

```bash
# Build image
./docker-helper.sh build

# Start services
./docker-helper.sh start

# View logs
./docker-helper.sh logs

# Stop services
./docker-helper.sh stop

# Open shell
./docker-helper.sh shell

# Run tests
./docker-helper.sh test

# Generate proof
./docker-helper.sh proof --amount 1000 --threshold 1000 --donor-secret hunter2 --tier 1
```

### Manual Docker Commands

If you prefer not to use helper scripts:

```bash
# Build
docker-compose build

# Start (detached)
docker-compose up -d

# Start (with logs)
docker-compose up

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Execute command in container
docker-compose exec app <command>

# Open shell
docker-compose exec app bash

# Restart
docker-compose restart
```

---

## Development Workflow

### 1. Code Changes

All source code is mounted as volumes, so changes are reflected immediately:

```bash
# Edit files on your host machine
# Changes are automatically synced to the container
```

### 2. Rebuild After Dependency Changes

If you modify `package.json` or add new dependencies:

```bash
# Rebuild the image
docker-compose build

# Restart services
docker-compose restart
```

### 3. Compile Noir Circuit

```bash
# Using helper script
./docker-helper.sh compile

# Or manually
docker-compose exec app bash -c "cd /app/zk-badges/donation_badge && nargo compile"
```

### 4. Build Cairo Verifier

```bash
# Using helper script
./docker-helper.sh build-verifier

# Or manually
docker-compose exec app bash -c "cd /app/donation_badge_verifier && scarb build"
```

### 5. Generate ZK Proof

```bash
# Using helper script
./docker-helper.sh proof --amount 1500 --threshold 1000 --donor-secret mysecret --tier 2

# Or manually
docker-compose exec app bash -c "cd /app/zk-badges && ./generate-proof.sh --amount 1500 --threshold 1000 --donor-secret mysecret --tier 2"
```

### 6. Run Tests

```bash
# Noir circuit tests
./docker-helper.sh test

# Or manually
docker-compose exec app bash -c "cd /app/zk-badges/donation_badge && nargo test"
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error:** `Bind for 0.0.0.0:8080 failed: port is already allocated`

**Solution:**
```bash
# Find process using port 8080
# Windows
netstat -ano | findstr :8080

# Linux/Mac
lsof -i :8080

# Kill the process or change port in docker-compose.yml
```

#### 2. Out of Memory During Build

**Error:** `Killed` or build hangs

**Solution:**
- Increase Docker memory limit in Docker Desktop settings
- Recommended: 8GB minimum, 16GB for ZK operations

#### 3. Permission Denied (Linux)

**Error:** `permission denied while trying to connect to the Docker daemon`

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
```

#### 4. Container Exits Immediately

**Solution:**
```bash
# Check logs
docker-compose logs app

# Common causes:
# - Missing .env file
# - Invalid environment variables
# - Port conflicts
```

#### 5. ZK Proof Generation Fails

**Error:** `bb: command not found` or similar

**Solution:**
```bash
# Rebuild image to ensure all tools are installed
docker-compose build --no-cache

# Verify tools are available
docker-compose exec app bb --version
docker-compose exec app nargo --version
docker-compose exec app garaga --help
```

### Debugging

#### View Container Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app
```

#### Inspect Container

```bash
# Open shell
docker-compose exec app bash

# Check installed tools
which nargo bb garaga scarb sncast

# Verify versions
nargo --version
bb --version
garaga --help
scarb --version
sncast --version
```

#### Check Environment

```bash
# Inside container
docker-compose exec app env | grep STARKNET
```

---

## Production Deployment

### Build for Production

```bash
# Build optimized image
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Or use build args
docker build --build-arg NODE_ENV=production -t starknet-privacy-toolkit:latest .
```

### Environment Configuration

Create a separate `.env.production`:

```env
NODE_ENV=production
STARKNET_RPC_URL=https://starknet-mainnet.g.alchemy.com/v2/YOUR_KEY
TONGO_CONTRACT_ADDRESS=0x72098b84989a45cc00697431dfba300f1f5d144ae916e98287418af4e548d96
# ... other production values
```

### Deploy with Docker Compose

```bash
# Use production environment
docker-compose --env-file .env.production up -d

# Or with production compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Deploy to Cloud

#### Docker Hub

```bash
# Tag image
docker tag starknet-privacy-toolkit:latest yourusername/starknet-privacy-toolkit:latest

# Push to Docker Hub
docker push yourusername/starknet-privacy-toolkit:latest
```

#### AWS ECS / Azure Container Instances / GCP Cloud Run

Use the generated Docker image with your cloud provider's container service.

### Nginx Reverse Proxy (Optional)

Uncomment the nginx service in `docker-compose.yml` and create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:8080;
    }

    upstream api {
        server app:3001;
    }

    server {
        listen 80;
        
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /api/ {
            proxy_pass http://api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

---

## Performance Optimization

### Build Cache

Use BuildKit for faster builds:

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Build with cache
docker-compose build
```

### Multi-Stage Build Benefits

- **Smaller final image**: Only production dependencies included
- **Faster builds**: Cached layers reused
- **Security**: Build tools not in final image

### Resource Limits

Add resource limits in `docker-compose.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G
```

---

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use secrets management** for production (Docker Secrets, AWS Secrets Manager)
3. **Run as non-root user** (TODO: add to Dockerfile)
4. **Scan images** for vulnerabilities:
   ```bash
   docker scan starknet-privacy-toolkit:latest
   ```
5. **Keep base images updated**
6. **Use specific version tags** instead of `latest`

---

## Cleanup

### Remove Containers and Volumes

```bash
# Using helper script
./docker-helper.sh clean

# Or manually
docker-compose down -v
```

### Remove Images

```bash
# Remove project images
docker-compose down --rmi all

# Remove all unused images
docker image prune -a
```

### Complete Cleanup

```bash
# Remove everything (containers, volumes, networks, images)
docker system prune -a --volumes
```

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Starknet Documentation](https://docs.starknet.io/)
- [Noir Documentation](https://noir-lang.org/)
- [Garaga Documentation](https://github.com/keep-starknet-strange/garaga)

---

## Support

For issues related to:
- **Docker setup**: Open an issue with logs from `docker-compose logs`
- **ZK toolchain**: Check versions match requirements in `BADGE_SETUP.md`
- **Starknet contracts**: See `DEPLOY.md` for deployment guide

---

## License

MIT License - see [LICENSE](LICENSE) file for details.
