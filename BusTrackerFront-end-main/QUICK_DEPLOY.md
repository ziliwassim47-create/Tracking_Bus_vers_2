# Quick Deployment Guide (PM2 + Node.js)

Since you already have PM2, Node.js, and Git installed, follow these steps:

## Step 1: Clone/Pull the Repository

```bash
# If you haven't cloned yet:
git clone <your-repo-url>
cd BusTrackerFront-end

# Or if already cloned, pull latest changes:
git pull
```

## Step 2: Update Backend URLs

**IMPORTANT:** Before building, update the backend URL in `src/LeafletRoutingMachine.js`:

```bash
nano src/LeafletRoutingMachine.js
```

Change line 8:
```javascript
// FROM:
const SOCKET_SERVER_URL = "http://51.91.249.6:4321";

// TO (use your VPS IP and backend port, likely 5000):
const SOCKET_SERVER_URL = "http://YOUR_VPS_IP:5000";
```

And line 20:
```javascript
// FROM:
const API_URL = "http://51.91.249.6:4321/api/user/1";

// TO:
const API_URL = "http://YOUR_VPS_IP:5000/api/user/1";
```

## Step 3: Install Dependencies and Build

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `build` folder with all the production files.

## Step 4: Install serve (if not already installed)

```bash
npm install -g serve
```

## Step 5: Start with PM2

```bash
# Start the frontend
pm2 start ecosystem-frontend.config.js

# Save PM2 configuration
    pm2 save

# Check status
pm2 list
pm2 logs bus-tracker-frontend
```

The frontend will be available on **port 3000** (http://your-vps-ip:3000)

## Step 6: Configure Firewall (if needed)

```bash
# Allow port 3000
sudo ufw allow 3000/tcp
# Or for firewalld:
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Updating the Frontend

When you need to update:

```bash
cd BusTrackerFront-end
git pull
npm install
npm run build
pm2 restart bus-tracker-frontend
```

## Change Port (Optional)

If you want to use a different port (e.g., 80 or 8080), edit `ecosystem-frontend.config.js`:

```javascript
args: '-s build -l 8080',  // Change 3000 to your desired port
```

Then restart:
```bash
pm2 restart bus-tracker-frontend
```

## Troubleshooting

- **Port already in use**: Change the port in `ecosystem-frontend.config.js`
- **Build fails**: Check Node.js version (`node -v` should be 14+)
- **Can't access**: Check firewall and PM2 status (`pm2 list`)
- **Socket errors**: Verify backend URL is correct and backend is running

## View Logs

```bash
# View all logs
pm2 logs bus-tracker-frontend

# View only errors
pm2 logs bus-tracker-frontend --err

# View in real-time
pm2 logs bus-tracker-frontend --lines 50
```

