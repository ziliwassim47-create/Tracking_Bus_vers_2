# Frontend Deployment Guide for VPS

## Prerequisites
- Node.js and npm installed on your VPS
- Nginx installed (or you can use PM2 with serve)
- Git installed

## Option 1: Using Nginx (Recommended)

### Step 1: Build the React App

On your VPS:

```bash
# Navigate to the frontend directory
cd BusTrackerFront-end

# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `build` folder with optimized production files.

### Step 2: Install and Configure Nginx

```bash
# Install nginx (if not already installed)
sudo apt update
sudo apt install nginx -y

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 3: Configure Nginx

Create an nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/bustracker-frontend
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    root /path/to/BusTrackerFront-end/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/bustracker-frontend /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### Step 4: Update Hardcoded URLs (Important!)

Before building, update the hardcoded URLs in `src/LeafletRoutingMachine.js`:

Replace:
```javascript
const SOCKET_SERVER_URL = "http://51.91.249.6:4321";
const API_URL = "http://51.91.249.6:4321/api/user/1";
```

With your VPS backend URL (e.g., `http://your-vps-ip:5000`)

## Option 2: Using PM2 with serve (Alternative)

### Step 1: Build the React App

```bash
cd BusTrackerFront-end
npm install
npm run build
```

### Step 2: Install serve globally

```bash
npm install -g serve
```

### Step 3: Create PM2 ecosystem file

Create `ecosystem-frontend.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'bus-tracker-frontend',
    script: 'serve',
    args: '-s build -l 3000',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

### Step 4: Start with PM2

```bash
pm2 start ecosystem-frontend.config.js
pm2 save
pm2 startup
```

The frontend will be available on port 3000.

## Option 3: Using Environment Variables (Best Practice)

### Step 1: Install dotenv

```bash
npm install dotenv
```

### Step 2: Create .env file

Create `.env` in the root directory:

```env
REACT_APP_SOCKET_URL=http://your-vps-ip:5000
REACT_APP_API_URL=http://your-vps-ip:5000
```

### Step 3: Update LeafletRoutingMachine.js

Replace hardcoded URLs with:

```javascript
const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";
const API_URL = `${process.env.REACT_APP_API_URL}/api/user/1`;
```

### Step 4: Rebuild

```bash
npm run build
```

## Firewall Configuration

If using a firewall, allow HTTP/HTTPS:

```bash
# For UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# For firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## SSL/HTTPS Setup (Optional but Recommended)

Use Let's Encrypt with Certbot:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## Quick Deployment Script

Save this as `deploy.sh`:

```bash
#!/bin/bash
cd BusTrackerFront-end
git pull
npm install
npm run build
sudo systemctl reload nginx
echo "Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

## Troubleshooting

1. **404 errors on refresh**: Make sure nginx has `try_files $uri $uri/ /index.html;`
2. **Socket connection errors**: Check that backend is running and firewall allows the port
3. **Build fails**: Check Node.js version (should be 14+)
4. **Static files not loading**: Check nginx root path and permissions

## Notes

- The build folder contains all static files needed
- After building, you can delete `node_modules` and `src` to save space
- Keep `package.json` and `package-lock.json` for future updates
- Rebuild after any code changes

