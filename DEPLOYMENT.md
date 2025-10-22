# 🚀 Deployment Guide

## **Ultra-Comprehensive Anonymous Messenger**

> **Production deployment with maximum security and anonymity**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Security Hardening](#security-hardening)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Scaling](#scaling)
8. [Backup & Recovery](#backup--recovery)

---

## 🎯 Prerequisites

### **System Requirements**
- **Linux Server** (Ubuntu 20.04+ recommended)
- **Node.js** 18.0.0+
- **Redis** 6.0+
- **Nginx** (reverse proxy)
- **SSL Certificate** (Let's Encrypt recommended)
- **Firewall** (ufw recommended)

### **Security Requirements**
- **Dedicated Server** or **VPS** (no shared hosting)
- **Private Network** for database connections
- **SSH Key Authentication** only
- **Fail2Ban** for intrusion prevention
- **SELinux/AppArmor** enabled

---

## 🔧 Environment Setup

### **1. Server Preparation**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install Docker (optional, for containerized deployment)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### **2. Security Setup**
```bash
# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow https
sudo ufw allow http  # Remove in production
sudo ufw enable

# Configure SSH for key-only access
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Install fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### **3. SSL Certificate (Let's Encrypt)**
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🐳 Docker Deployment

### **Quick Start**
```bash
# Clone repository
git clone <repository-url>
cd anonymous-messenger

# Set environment variables
cp .env.example .env.production
# Edit .env.production with your settings

# Start with Docker Compose
docker-compose -f docker-compose.production.yml up -d
```

### **Docker Compose (Production)**
```yaml
version: '3.8'

services:
  # Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/production.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./frontend/build:/var/www/frontend
    depends_on:
      - backend
    restart: always

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.production
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis
    restart: always

  # Redis Cluster
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_production:/data
    restart: always

  # File Storage
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
    environment:
      - MINIO_ROOT_USER=${MINIO_ACCESS_KEY}
      - MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    restart: always

volumes:
  redis_production:
  minio_data:

networks:
  default:
    name: anonymous-messenger-production
```

---

## 🔨 Manual Deployment

### **Backend Setup**
```bash
# Navigate to backend
cd backend

# Install dependencies
npm ci --production

# Build application
npm run build

# Set up PM2 process manager
npm install -g pm2
pm2 start src/server.js --name "anonymous-messenger-backend"

# Save PM2 configuration
pm2 save
pm2 startup
```

### **Frontend Setup**
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm ci --production

# Build for production
npm run build

# Serve with Nginx
sudo cp -r build /var/www/anonymous-messenger
sudo chown -R www-data:www-data /var/www/anonymous-messenger
```

### **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Content-Security-Policy "default-src 'self'";

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        root /var/www/anonymous-messenger;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Security: Block access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

---

## 🔒 Security Hardening

### **1. System Security**
```bash
# Enable automatic updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure sysctl for security
sudo tee /etc/sysctl.d/99-security.conf << EOF
# IP Spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP broadcast requests
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0

# Block SYN attacks
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.netfilter.ip_conntrack_tcp_timeout_syn_recv = 60

# Log Martians
net.ipv4.conf.all.log_martians = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Don't relay bootp
net.ipv4.conf.all.bootp_relay = 0
EOF

sudo sysctl -p /etc/sysctl.d/99-security.conf
```

### **2. Application Security**
```bash
# Set secure permissions
sudo chown -R www-data:www-data /var/www/anonymous-messenger
sudo find /var/www/anonymous-messenger -type f -exec chmod 644 {} \;
sudo find /var/www/anonymous-messenger -type d -exec chmod 755 {} \;

# Configure log rotation
sudo tee /etc/logrotate.d/anonymous-messenger << EOF
/var/log/anonymous-messenger/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
EOF
```

### **3. Database Security**
```bash
# Redis security
sudo tee /etc/redis/redis.conf << EOF
# Network
bind 127.0.0.1
protected-mode yes
port 6379

# Authentication
requirepass YOUR_SECURE_REDIS_PASSWORD

# Memory
maxmemory 256mb
maxmemory-policy allkeys-lru

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
EOF

sudo systemctl restart redis-server
```

---

## 📊 Monitoring & Maintenance

### **1. Application Monitoring**
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Set up log monitoring
sudo apt install -y logwatch
sudo cp /usr/share/logwatch/default.conf/logwatch.conf /etc/logwatch/conf/

# Configure cron for health checks
crontab -e
# Add: */5 * * * * /usr/local/bin/health-check.sh
```

### **2. Health Check Script**
```bash
#!/bin/bash
# /usr/local/bin/health-check.sh

HEALTH_URL="http://localhost:3001/health"
LOG_FILE="/var/log/anonymous-messenger/health.log"

# Check backend health
if curl -f -s $HEALTH_URL > /dev/null; then
    echo "$(date): Backend is healthy" >> $LOG_FILE
else
    echo "$(date): Backend is unhealthy - restarting" >> $LOG_FILE
    pm2 restart anonymous-messenger-backend
fi

# Check Redis
if redis-cli ping | grep -q PONG; then
    echo "$(date): Redis is healthy" >> $LOG_FILE
else
    echo "$(date): Redis is unhealthy - restarting" >> $LOG_FILE
    sudo systemctl restart redis-server
fi
```

### **3. Backup Script**
```bash
#!/bin/bash
# /usr/local/bin/backup.sh

BACKUP_DIR="/backup/anonymous-messenger"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Redis
redis-cli SAVE
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_backup_$DATE.rdb

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /var/www/anonymous-messenger

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -name "*.rdb" -mtime +7 -delete
find $BACKUP_DIR -type f -name "*.tar.gz" -mtime +7 -delete

echo "$(date): Backup completed" >> /var/log/anonymous-messenger/backup.log
```

---

## 📈 Scaling

### **Horizontal Scaling Setup**
```bash
# Load Balancer Configuration (HAProxy)
sudo apt install -y haproxy

sudo tee /etc/haproxy/haproxy.cfg << EOF
global
    maxconn 2048
    log /dev/log local0
    log /dev/log local1 notice
    daemon

defaults
    log global
    mode http
    option httplog
    option dontlognull
    timeout connect 5000
    timeout client 50000
    timeout server 50000

frontend http_front
    bind *:80
    redirect scheme https if !{ ssl_fc }
    default_backend backend_servers

frontend https_front
    bind *:443 ssl crt /etc/ssl/certs/anonymous-messenger.pem
    default_backend backend_servers

backend backend_servers
    balance roundrobin
    option httpchk GET /health
    server backend1 10.0.0.1:3001 check
    server backend2 10.0.0.2:3001 check
    server backend3 10.0.0.3:3001 check
EOF

sudo systemctl restart haproxy
```

### **Redis Cluster Setup**
```bash
# Install Redis Cluster
sudo apt install -y redis-tools

# Create cluster (6 nodes minimum)
redis-cli --cluster create \
  10.0.0.1:6379 10.0.0.2:6379 10.0.0.3:6379 \
  10.0.0.4:6379 10.0.0.5:6379 10.0.0.6:6379 \
  --cluster-replicas 1
```

---

## 💾 Backup & Recovery

### **Automated Backup Strategy**
```bash
# Configure automatic backups
crontab -e
# Add:
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup.sh
# Weekly full backup on Sundays at 3 AM
0 3 * * 0 /usr/local/bin/full-backup.sh
```

### **Recovery Procedures**
```bash
# Restore from backup
cd /backup/anonymous-messenger
LATEST_BACKUP=$(ls -t *.tar.gz | head -1)

# Stop services
sudo systemctl stop nginx
pm2 stop all

# Restore files
sudo tar -xzf $LATEST_BACKUP -C /

# Restore Redis
redis-cli FLUSHALL
cat redis_backup_*.rdb | redis-cli --pipe

# Start services
sudo systemctl start nginx
pm2 start all

# Verify health
curl -f http://localhost:3001/health
```

---

## 🔧 Troubleshooting

### **Common Issues**

#### **1. WebSocket Connection Issues**
```bash
# Check WebSocket configuration
sudo netstat -tlnp | grep :3001

# Test WebSocket connectivity
wscat -c ws://localhost:3001
```

#### **2. Redis Connection Issues**
```bash
# Check Redis status
redis-cli ping
redis-cli info memory

# Check Redis logs
tail -f /var/log/redis/redis-server.log
```

#### **3. SSL Certificate Issues**
```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificate
sudo certbot renew
```

### **Log Locations**
- **Application Logs**: `/var/log/anonymous-messenger/`
- **Nginx Logs**: `/var/log/nginx/`
- **Redis Logs**: `/var/log/redis/`
- **System Logs**: `/var/log/syslog`

---

## 🚀 Performance Optimization

### **1. Nginx Optimization**
```nginx
# /etc/nginx/nginx.conf
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss;
}
```

### **2. Node.js Optimization**
```bash
# PM2 ecosystem file
module.exports = {
  apps: [{
    name: 'anonymous-messenger-backend',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    }
  }]
};
```

---

## 📞 Support

### **Emergency Contacts**
- **Security Issues**: security@anonymous-messenger.org
- **Technical Support**: support@anonymous-messenger.org
- **Abuse Reports**: abuse@anonymous-messenger.org

### **Monitoring Contacts**
- **System Administrator**: admin@your-domain.com
- **Database Administrator**: dba@your-domain.com

---

**⚠️ Security Notice**: This deployment handles highly sensitive anonymous communication data. Ensure all security measures are properly implemented before going live.

*Deploy with caution and maintain constant vigilance.*