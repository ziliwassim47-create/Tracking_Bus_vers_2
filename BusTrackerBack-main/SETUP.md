# Database Setup Instructions

## Step 1: Create .env file

Create a `.env` file in the `BusTrackerBack` directory with your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=bus_tracker
```

Replace `your_password_here` with your actual MySQL password.

## Step 2: Setup Database

You have two options:

### Option A: Using the setup script (Recommended)
```bash
npm run setup-db
```

This will:
- Create the database if it doesn't exist
- Create the users table
- Insert sample data for testing

### Option B: Using MySQL directly
```bash
mysql -u root -p < database.sql
```

Or manually in MySQL:
```sql
CREATE DATABASE bus_tracker;
USE bus_tracker;
-- Then run the SQL from database.sql
```

## Step 3: Verify Setup

After setup, you should see:
- Database `bus_tracker` created
- Table `users` with columns: ID, NOM, VILLE, TLF, ID_BUS, presence
- Sample data inserted (2 test users)

## Step 4: Start the Server

```bash
npm start
```

The server should connect to MySQL and start on port 5000.

## Step 5: Deploy with PM2 (Production)

### Install PM2 (if not already installed)
```bash
npm install -g pm2
```

### Create logs directory
```bash
mkdir -p logs
```

### Start the application with PM2
```bash
pm2 start ecosystem.config.js
```

### Other useful PM2 commands:

**View running processes:**
```bash
pm2 list
```

**View logs:**
```bash
pm2 logs bus-tracker-backend
```

**Restart the application:**
```bash
pm2 restart bus-tracker-backend
```

**Stop the application:**
```bash
pm2 stop bus-tracker-backend
```

**Delete the application from PM2:**
```bash
pm2 delete bus-tracker-backend
```

**Save PM2 configuration (to auto-start on server reboot):**
```bash
pm2 save
pm2 startup
```

The last command will generate a command that you need to run with sudo to enable PM2 to start on system boot.

### Monitor the application:
```bash
pm2 monit
```

The server will be running on port 5000 and will automatically restart if it crashes.

