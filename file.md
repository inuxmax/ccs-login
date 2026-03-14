# CCS VPS Setup Guide

This guide documents a complete VPS deployment for CCS using Docker, Nginx, SSL, a dashboard domain, and a separate API domain.

## Deployment Goal

Use this topology:

- Dashboard: [`api.fcheck.net`](docker/README.md)
- CLIProxy API: [`v2.fcheck.net`](src/cliproxy/config/port-manager.ts:7)

Internal services:

- Dashboard/Web UI: `127.0.0.1:3000`
- CLIProxy API: `127.0.0.1:8317`

This matches the Docker documentation in [`docker/README.md`](docker/README.md), the Docker image exposure in [`docker/Dockerfile`](docker/Dockerfile:81), and the default CLIProxy port in [`CLIPROXY_DEFAULT_PORT`](src/cliproxy/config/port-manager.ts:7).

---

## 1. Architecture Overview

CCS is not just a static frontend. The app includes:

- a long-running Node server in [`startServer()`](src/web-server/index.ts:33)
- WebSocket support in [`setupWebSocket()`](src/web-server/websocket.ts:22)
- persistent data under `~/.ccs`, documented in [`docker/README.md`](docker/README.md)
- a separate CLIProxy API on port `8317`, documented in [`docker/README.md`](docker/README.md) and defined by [`CLIPROXY_DEFAULT_PORT`](src/cliproxy/config/port-manager.ts:7)

Recommended production layout:

- Docker runs the app
- Nginx terminates HTTPS
- Nginx reverse proxies by subdomain
- only ports `80` and `443` are public
- ports `3000` and `8317` remain internal

---

## 2. Requirements

VPS assumptions:

- Ubuntu 22.04 or Debian 12
- root or sudo access
- domain DNS managed by you
- ports `80` and `443` open

Software needed:

- Docker Engine
- Docker Compose plugin
- Nginx
- Certbot

---

## 3. DNS Setup

Create these DNS records:

- `api.fcheck.net` → VPS public IP
- `v2.fcheck.net` → VPS public IP

Verify:

```bash
nslookup api.fcheck.net
nslookup v2.fcheck.net
```

Both must resolve to the VPS IP before SSL setup.

---

## 4. Install Base Packages

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg nginx certbot python3-certbot-nginx
```

Install Docker:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Check versions:

```bash
docker --version
sudo docker compose version
nginx -v
certbot --version
```

---

## 5. Clone the Project to the VPS

If you want to deploy this exact repository:

```bash
sudo mkdir -p /opt/ccs
sudo chown $USER:$USER /opt/ccs
git clone https://github.com/kaitranntt/ccs.git /opt/ccs
```

If you want to deploy a different GitHub repository or a fork, just replace the Git URL. The Docker build uses the local project source through [`context: ..`](docker/docker-compose.yml:7), so whichever repo is cloned into `/opt/ccs` will be built.

Example:

```bash
rm -rf /opt/ccs
git clone https://github.com/USER/REPO.git /opt/ccs
```

---

## 6. Review Docker Configuration

The included Compose file in [`docker/docker-compose.yml`](docker/docker-compose.yml) already defines:

- dashboard mapping on `3000` in [`ports`](docker/docker-compose.yml:11)
- CLIProxy mapping on `8317` in [`ports`](docker/docker-compose.yml:13)
- persistent volumes for `.ccs`, `.claude`, `.opencode`, and `.grok-cli` in [`volumes`](docker/docker-compose.yml:27)
- container healthcheck in [`healthcheck`](docker/docker-compose.yml:33)

The image itself exposes both ports in [`EXPOSE 3000 8317`](docker/Dockerfile:81).

---

## 7. Build and Start CCS with Docker

```bash
cd /opt/ccs
sudo docker compose -f docker/docker-compose.yml up --build -d
```

Check status:

```bash
sudo docker compose -f docker/docker-compose.yml ps
sudo docker compose -f docker/docker-compose.yml logs --tail=100
```

Expected:

- one running service
- ports mapped for `3000` and `8317`
- no crash loop

---

## 8. Verify Internal Services Before Nginx

Test directly on the VPS.

### Dashboard

```bash
curl http://127.0.0.1:3000/
```

Expected: HTML content.

### CLIProxy API

```bash
curl -i http://127.0.0.1:8317/
curl -i http://127.0.0.1:8317/api/provider/codex
```

Expected:

- `8317` responds
- `/api/provider/codex` should return an API-style response, maybe an auth or request error, but not the dashboard HTML

If `127.0.0.1:3000` or `127.0.0.1:8317` fail here, fix Docker first before touching Nginx.

---

## 9. What Each Port Is For

### Port `3000`

This is the dashboard/web server. The app is started by [`startServer()`](src/web-server/index.ts:33), which serves the web app and related web routes.

### Port `8317`

This is the CLIProxy API port, defined by [`CLIPROXY_DEFAULT_PORT`](src/cliproxy/config/port-manager.ts:7).

It is used for provider routes like:

- `http://127.0.0.1:8317/api/provider/codex`

It also serves management routes built through [`buildProxyUrl()`](src/cliproxy/proxy-target-resolver.ts:82), including paths under `/v0/management/*`.

For production:

- do not call `127.0.0.1:8317` from your local computer
- use `https://v2.fcheck.net/...` externally
- keep the raw port internal whenever possible

---

## 10. Nginx Design

Use subdomain-based routing:

- [`api.fcheck.net`](docker/README.md) → `127.0.0.1:3000`
- [`v2.fcheck.net`](src/cliproxy/config/port-manager.ts:7) → `127.0.0.1:8317`

This avoids mixing dashboard and API traffic on one hostname and is simpler to debug.

---

## 11. Create Nginx Site Configuration

Create [`/etc/nginx/sites-available/ccs-fcheck`](../etc/nginx/sites-available/ccs-fcheck) with this HTTP-only bootstrap config:

```nginx
server {
    listen 80;
    server_name api.fcheck.net;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name v2.fcheck.net;

    location / {
        proxy_pass http://127.0.0.1:8317;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Notes:

- the dashboard block includes WebSocket headers because WebSocket support is used in [`setupWebSocket()`](src/web-server/websocket.ts:22)
- the API block forwards all CLIProxy traffic to `8317`

---

## 12. Enable Nginx Site and Remove Default Conflicts

Enable the site:

```bash
sudo ln -sf /etc/nginx/sites-available/ccs-fcheck /etc/nginx/sites-enabled/ccs-fcheck
```

Remove the default site if it still exists:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

Check for conflicting server names:

```bash
sudo nginx -T
```

Look for:

- duplicate `server_name api.fcheck.net`
- duplicate `server_name v2.fcheck.net`
- a leftover default HTTPS server returning the Nginx welcome page

Validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 13. Test HTTP Routing Before SSL

```bash
curl -I http://api.fcheck.net
curl -i http://v2.fcheck.net/api/provider/codex
```

Expected:

- `api.fcheck.net` responds from the dashboard
- `v2.fcheck.net/api/provider/codex` reaches CLIProxy and behaves like `127.0.0.1:8317/api/provider/codex`

If `v2.fcheck.net` shows dashboard HTML or `Welcome to nginx!`, Nginx is still routing incorrectly.

---

## 14. Issue SSL Certificates with Certbot

Once HTTP works, request certificates:

```bash
sudo certbot --nginx -d api.fcheck.net -d v2.fcheck.net
```

Choose redirect to HTTPS when prompted.

Certbot will update the Nginx config automatically.

Test renewal:

```bash
sudo certbot renew --dry-run
```

---

## 15. Expected Final HTTPS Configuration

After Certbot, the logical result should be similar to this in [`/etc/nginx/sites-available/ccs-fcheck`](../etc/nginx/sites-available/ccs-fcheck):

```nginx
server {
    server_name api.fcheck.net;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/api.fcheck.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.fcheck.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    server_name v2.fcheck.net;

    location / {
        proxy_pass http://127.0.0.1:8317;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/v2.fcheck.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/v2.fcheck.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    server_name api.fcheck.net;
    return 301 https://$host$request_uri;
}

server {
    listen 80;
    server_name v2.fcheck.net;
    return 301 https://$host$request_uri;
}
```

---

## 16. How to Use the Deployed Services

### Dashboard

Open:

```text
https://api.fcheck.net
```

### Provider API

Use:

```text
https://v2.fcheck.net/api/provider/codex
```

Do not use `http://127.0.0.1:8317` from your own PC. That address is only valid inside the VPS.

### Management API

If required, CLIProxy management endpoints are under:

```text
https://v2.fcheck.net/v0/management/...
```

These are built by logic around [`getProxyTarget()`](src/cliproxy/proxy-target-resolver.ts:47), [`buildProxyUrl()`](src/cliproxy/proxy-target-resolver.ts:82), and [`buildManagementHeaders()`](src/cliproxy/proxy-target-resolver.ts:120).

---

## 17. OAuth Notes for VPS Use

OAuth on a VPS can differ from local desktop behavior.

The dashboard auth routes are implemented in [`cliproxy-auth-routes.ts`](src/web-server/routes/cliproxy-auth-routes.ts:626) and related callback submission logic in [`cliproxy-auth-routes.ts`](src/web-server/routes/cliproxy-auth-routes.ts:775).

Important points:

- some provider auth flows may redirect to a localhost callback URL
- on a remote VPS, that localhost can point to the browser machine instead of the server
- in such cases, manual callback submission or paste-callback flow may be required

Relevant flow endpoints:

- start URL route in [`router.post('/:provider/start-url')`](src/web-server/routes/cliproxy-auth-routes.ts:626)
- auth status route in [`router.get('/:provider/status')`](src/web-server/routes/cliproxy-auth-routes.ts:723)
- manual callback route in [`router.post('/:provider/submit-callback')`](src/web-server/routes/cliproxy-auth-routes.ts:775)

If login redirects your browser to something like `http://localhost:1455/auth/callback?...`, copy the full callback URL and submit it through the callback submission flow instead of trying to expose that local callback port publicly.

---

## 18. Firewall Recommendations

Only expose `80` and `443` publicly.

If using UFW:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp
sudo ufw deny 8317/tcp
sudo ufw enable
sudo ufw status
```

This ensures:

- Nginx is public
- dashboard and CLIProxy raw ports stay internal

---

## 19. Common Commands

### Start or rebuild

```bash
cd /opt/ccs
sudo docker compose -f docker/docker-compose.yml up --build -d
```

### View logs

```bash
cd /opt/ccs
sudo docker compose -f docker/docker-compose.yml logs -f
```

### Restart

```bash
cd /opt/ccs
sudo docker compose -f docker/docker-compose.yml restart
```

### Stop

```bash
cd /opt/ccs
sudo docker compose -f docker/docker-compose.yml down
```

### Full rebuild

```bash
cd /opt/ccs
sudo docker compose -f docker/docker-compose.yml down
sudo docker compose -f docker/docker-compose.yml up --build -d
```

---

## 20. Updating to a Different GitHub Repository

If you want to switch to another GitHub repository later:

```bash
sudo docker compose -f /opt/ccs/docker/docker-compose.yml down
mv /opt/ccs /opt/ccs_backup_$(date +%F_%H-%M-%S)
git clone https://github.com/USER/REPO.git /opt/ccs
cd /opt/ccs
sudo docker compose -f docker/docker-compose.yml up --build -d
```

This works as long as the new repository keeps a compatible Docker structure, especially [`docker/Dockerfile`](docker/Dockerfile) and [`docker/docker-compose.yml`](docker/docker-compose.yml).

---

## 21. Troubleshooting Checklist

### Problem: domain shows `Welcome to nginx!`

Likely causes:

- default Nginx site still enabled
- wrong `server_name`
- duplicate site configs

Checks:

```bash
sudo nginx -T
ls -la /etc/nginx/sites-enabled
```

### Problem: dashboard works but API does not

Likely causes:

- CLIProxy on `8317` is not healthy
- `v2.fcheck.net` proxy rule is wrong
- the API request is missing required auth

Checks:

```bash
curl -i http://127.0.0.1:8317/api/provider/codex
curl -i https://v2.fcheck.net/api/provider/codex
```

### Problem: OAuth login ends at localhost callback

Likely causes:

- provider flow is using a localhost callback intended for local/headed auth
- browser is finishing auth on your own machine instead of the VPS

Use the manual callback submission flow documented in [`cliproxy-auth-routes.ts`](src/web-server/routes/cliproxy-auth-routes.ts:775).

### Problem: permission errors under `.claude` or `.ccs`

The Docker docs mention permission issues in [`docker/README.md`](docker/README.md). Check volumes and container permissions:

```bash
cd /opt/ccs
sudo docker compose -f docker/docker-compose.yml down -v
sudo docker compose -f docker/docker-compose.yml up --build -d
```

Warning: removing volumes deletes persisted container data.

---

## 22. Final Validation Commands

Run these after setup:

```bash
curl -I https://api.fcheck.net
curl -i https://v2.fcheck.net/api/provider/codex
curl -i http://127.0.0.1:3000/
curl -i http://127.0.0.1:8317/api/provider/codex
sudo docker compose -f /opt/ccs/docker/docker-compose.yml ps
sudo nginx -t
sudo certbot renew --dry-run
```

Expected outcome:

- [`https://api.fcheck.net`](docker/README.md) opens the dashboard
- [`https://v2.fcheck.net/api/provider/codex`](src/cliproxy/config/port-manager.ts:7) reaches CLIProxy
- internal ports still work locally on the VPS
- Nginx config is valid
- SSL renewal test succeeds

---

## 23. Summary

Recommended production deployment:

- clone the project to `/opt/ccs`
- run Docker Compose from [`docker/docker-compose.yml`](docker/docker-compose.yml)
- keep dashboard on `3000`
- keep CLIProxy on `8317`
- publish only through Nginx
- use `api.fcheck.net` for the dashboard
- use `v2.fcheck.net` for the API
- secure everything with Let's Encrypt SSL

This is the cleanest VPS setup for CCS with separate dashboard and API entrypoints.