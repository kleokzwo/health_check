# BitcoinII Dashboard (Docker)

A lightweight, self-hosted **dashboard for a BitcoinII full node**, designed to run alongside `kzwo/bitcoin-ii` using Docker or Docker Compose.

* ✅ No exposed RPC by default
* ✅ Uses **cookie-based RPC auth** (best practice)
* ✅ Works on **x86 & ARM (Raspberry Pi)**
* ✅ Minimal, fast, and dependency-light

---

## Screenshots

> Simple status dashboard showing:
![BitcoinII Dashboard](https://raw.githubusercontent.com/kleokzwo/health_check/refs/heads/main/health_check.png)


* chain & block height
* sync status
* peers
* mempool size & usage
* node version

---

## Requirements

* Docker ≥ 20
* Docker Compose v2
* A running BitcoinII node (Docker or native)

Recommended:

* [`kzwo/bitcoin-ii`](https://hub.docker.com/r/kzwo/bitcoin-ii)

---

## Quick Start (Recommended: Docker Compose)

### 1️⃣ Create a new folder

```bash
mkdir bitcoinii-stack
cd bitcoinii-stack
```

---

### 2️⃣ Create `docker-compose.yml`

```yaml
services:
  bitcoinii:
    image: kzwo/bitcoin-ii:latest
    container_name: bitcoinii
    restart: unless-stopped

    volumes:
      - bc2-data:/data

    ports:
      - "8338:8338"               # P2P
      - "127.0.0.1:8339:8339"     # local-only service

    command:
      - "-printtoconsole=1"
      - "-server=1"
      - "-rpcport=8337"
      - "-rpcbind=0.0.0.0"
      - "-rpcallowip=172.30.0.0/24"

    healthcheck:
      test: ["CMD-SHELL", "bitcoinII-cli -datadir=/data -rpcwait=30 getblockchaininfo >/dev/null 2>&1 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 20
      start_period: 120s

    networks:
      bc2net:
        ipv4_address: 172.30.0.10

  dashboard:
    image: kzwo/bitcoin-ii-dashboard:latest
    container_name: bitcoinii-dashboard
    restart: unless-stopped

    depends_on:
      bitcoinii:
        condition: service_healthy

    volumes:
      - bc2-data:/data:ro   # read-only access to RPC cookie

    environment:
      RPC_HOST: bitcoinii
      RPC_PORT: "8337"
      RPC_COOKIE: "/data/.cookie"

    ports:
      - "127.0.0.1:3000:3000"

    networks:
      bc2net:
        ipv4_address: 172.30.0.20

networks:
  bc2net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.30.0.0/24

volumes:
  bc2-data:
```

---

### 3️⃣ Start everything

```bash
docker compose up -d
```

---

### 4️⃣ Open the dashboard

👉 **[http://127.0.0.1:3000](http://127.0.0.1:3000)**

---

## How it works (Security model)

* The BitcoinII node creates an **RPC cookie** at:

  ```
  /data/.cookie
  ```
* The dashboard reads this file **read-only**
* No RPC username/password needed
* RPC port is **not exposed publicly**

This is the same model used by Bitcoin Core tooling.

---

## Common Commands

### View logs

```bash
docker compose logs -f bitcoinii
docker compose logs -f dashboard
```

### Stop everything

```bash
docker compose down
```

### Restart

```bash
docker compose up -d
```

### Update images

```bash
docker compose pull
docker compose up -d
```

---

## Running Dashboard with a Non-Docker Node (Advanced)

If you already run `bitcoinIId` natively:

```bash
docker run -d \
  --name bitcoinii-dashboard \
  -p 127.0.0.1:3000:3000 \
  -v ~/.bitcoinII:/data:ro \
  -e RPC_COOKIE=/data/.cookie \
  -e RPC_HOST=host.docker.internal \
  -e RPC_PORT=8337 \
  kzwo/bitcoin-ii-dashboard:latest
```

---

## Contributing

Contributions are welcome!

Ideas:

* Sync progress bar
* Peer list
* Disk usage & uptime
* Dark mode
* REST / metrics endpoint

### Development

```bash
git clone https://github.com/kleokzwo/health_check
cd health_check > dashboard
docker build -t bitcoinii-dashboard-dev .
docker run -p 3000:3000 bitcoinii-dashboard-dev
```

## Disclaimer

This is an **unofficial community project** and not endorsed by the BitcoinII Core developers.

Use at your own risk.

---

## License

MIT

