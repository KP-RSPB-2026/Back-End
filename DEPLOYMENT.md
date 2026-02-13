# Deployment Guide

Panduan lengkap untuk deploy aplikasi backend ke production.

## Pilihan Platform Deployment

### 1. Heroku (Recommended untuk pemula)
### 2. Railway
### 3. Render
### 4. VPS (DigitalOcean, AWS, Google Cloud)
### 5. Vercel (untuk API ringan)

---

## Deployment ke Heroku

### Prerequisites
- Akun Heroku (gratis di https://heroku.com)
- Heroku CLI terinstall
- Git terinstall

### Langkah-langkah

#### 1. Install Heroku CLI

**Windows:**
Download dari https://devcenter.heroku.com/articles/heroku-cli

**Mac:**
```bash
brew tap heroku/brew && brew install heroku
```

**Linux:**
```bash
curl https://cli-assets.heroku.com/install.sh | sh
```

#### 2. Login ke Heroku

```bash
heroku login
```

#### 3. Buat Aplikasi Heroku

```bash
cd Back-End
heroku create nama-apotik-api
```

#### 4. Setup MongoDB Atlas

1. Daftar di https://www.mongodb.com/cloud/atlas (gratis)
2. Buat cluster baru (pilih free tier)
3. Buat database user
4. Whitelist IP: `0.0.0.0/0` (allow from anywhere)
5. Dapatkan connection string

#### 5. Set Environment Variables

```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="your_mongodb_atlas_connection_string"
heroku config:set JWT_SECRET="your_very_secret_key_here"
heroku config:set JWT_EXPIRE=7d
heroku config:set ALLOWED_ORIGINS="https://your-frontend-domain.com"
```

#### 6. Buat Procfile

Buat file `Procfile` di root folder Back-End:

```
web: node server.js
```

#### 7. Update package.json

Pastikan ada start script:

```json
{
  "scripts": {
    "start": "node server.js"
  },
  "engines": {
    "node": "18.x"
  }
}
```

#### 8. Deploy

```bash
git add .
git commit -m "Ready for deployment"
git push heroku main
```

Jika branch bukan main:
```bash
git push heroku master:main
```

#### 9. Seed Database (Optional)

```bash
heroku run npm run seed
```

#### 10. Lihat Logs

```bash
heroku logs --tail
```

#### 11. Buka Aplikasi

```bash
heroku open
```

---

## Deployment ke Railway

### Langkah-langkah

#### 1. Daftar di Railway

https://railway.app (bisa login dengan GitHub)

#### 2. New Project

- Click "New Project"
- Pilih "Deploy from GitHub repo"
- Select repository

#### 3. Setup Environment Variables

Di Railway dashboard:
- Settings → Variables
- Tambahkan semua variable dari `.env`:
  - `NODE_ENV=production`
  - `MONGODB_URI=...`
  - `JWT_SECRET=...`
  - `JWT_EXPIRE=7d`
  - `PORT=5000`

#### 4. Deploy

Railway akan auto-deploy setiap kali ada push ke GitHub.

#### 5. Custom Domain (Optional)

- Settings → Domains
- Generate domain atau tambah custom domain

---

## Deployment ke Render

### Langkah-langkah

#### 1. Daftar di Render

https://render.com (bisa login dengan GitHub)

#### 2. New Web Service

- Dashboard → New → Web Service
- Connect repository

#### 3. Konfigurasi

- **Name:** nama-apotik-api
- **Environment:** Node
- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Plan:** Free

#### 4. Environment Variables

Tambahkan di "Environment" section:
```
NODE_ENV=production
MONGODB_URI=your_connection_string
JWT_SECRET=your_secret
JWT_EXPIRE=7d
PORT=10000
```

#### 5. Deploy

Click "Create Web Service" - akan auto-deploy.

---

## Deployment ke VPS (Ubuntu)

### Prerequisites
- VPS dengan Ubuntu 20.04+
- Domain (optional)

### Langkah-langkah

#### 1. SSH ke VPS

```bash
ssh root@your_server_ip
```

#### 2. Update System

```bash
apt update && apt upgrade -y
```

#### 3. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
```

#### 4. Install MongoDB

```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod
```

#### 5. Install PM2

```bash
npm install -g pm2
```

#### 6. Clone Repository

```bash
cd /var/www
git clone your_repository_url apotik-backend
cd apotik-backend/Back-End
```

#### 7. Install Dependencies

```bash
npm install --production
```

#### 8. Create .env File

```bash
nano .env
```

Isi dengan configuration production.

#### 9. Start with PM2

```bash
pm2 start server.js --name apotik-api
pm2 save
pm2 startup
```

#### 10. Install Nginx (Reverse Proxy)

```bash
apt install -y nginx
```

#### 11. Configure Nginx

```bash
nano /etc/nginx/sites-available/apotik-api
```

Isi dengan:

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable site:

```bash
ln -s /etc/nginx/sites-available/apotik-api /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### 12. Setup SSL dengan Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your_domain.com
```

#### 13. Setup Firewall

```bash
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw enable
```

---

## Checklist Sebelum Deploy

- [ ] Update `MONGODB_URI` ke MongoDB Atlas atau MongoDB di server
- [ ] Generate JWT secret yang kuat
- [ ] Set `NODE_ENV=production`
- [ ] Update `ALLOWED_ORIGINS` dengan domain frontend
- [ ] Test semua endpoints di local dulu
- [ ] Hapus console.log yang tidak perlu
- [ ] Setup monitoring/logging
- [ ] Backup strategy untuk database

---

## Environment Variables untuk Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/apotik_db
JWT_SECRET=very_strong_secret_key_minimum_32_characters
JWT_EXPIRE=7d
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## Monitoring & Logging

### PM2 Monitoring

```bash
pm2 monit
pm2 logs apotik-api
pm2 restart apotik-api
pm2 stop apotik-api
```

### Log Files Location

Heroku:
```bash
heroku logs --tail
```

Railway/Render:
Check dashboard → Logs

VPS:
```bash
pm2 logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## Database Backup

### MongoDB Atlas
- Automated backups included
- Manual backup: Database → Backup → Create Backup

### VPS MongoDB
```bash
# Backup
mongodump --uri="mongodb://localhost:27017/apotik_db" --out=/backups/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://localhost:27017/apotik_db" /backups/20240101
```

Setup cron job untuk auto backup:
```bash
crontab -e
```

Tambahkan:
```
0 2 * * * mongodump --uri="mongodb://localhost:27017/apotik_db" --out=/backups/$(date +\%Y\%m\%d)
```

---

## Performance Tips

1. **Enable Compression**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Rate Limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100
   });
   app.use('/api/', limiter);
   ```

3. **Helmet for Security**
   ```javascript
   const helmet = require('helmet');
   app.use(helmet());
   ```

4. **Database Indexing**
   - Add indexes di frequently queried fields
   - Sudah ada di models (unique fields)

---

## Troubleshooting

### Error: Cannot connect to MongoDB
- Check connection string
- Check IP whitelist di MongoDB Atlas
- Check MongoDB service status

### Error: Port already in use
- Change PORT in environment variables
- Kill process using the port

### Error: 502 Bad Gateway (Nginx)
- Check if Node.js app is running
- Check PM2 logs
- Check Nginx configuration

---

## Update Aplikasi

### Heroku
```bash
git add .
git commit -m "Update message"
git push heroku main
```

### Railway/Render
Push ke GitHub, auto-deploy.

### VPS
```bash
cd /var/www/apotik-backend
git pull
cd Back-End
npm install
pm2 restart apotik-api
```

---

## Security Best Practices

1. ✅ Jangan commit `.env` file
2. ✅ Gunakan strong JWT secret
3. ✅ Enable CORS hanya untuk domain yang diperlukan
4. ✅ Gunakan HTTPS di production
5. ✅ Regular update dependencies
6. ✅ Implement rate limiting
7. ✅ Validate semua input
8. ✅ Hash passwords dengan bcrypt
9. ✅ Regular database backup
10. ✅ Monitor logs untuk suspicious activity

---

**Selamat! Aplikasi Anda sudah siap production! 🚀**
