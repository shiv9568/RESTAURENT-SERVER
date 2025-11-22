# MongoDB Atlas Connection Setup

## Your Connection String

Your MongoDB Atlas cluster is ready to use:
```
mongodb+srv://<db_username>:<db_password>@dkrestaurent.va5lhmg.mongodb.net/?appName=DKrestaurent
```

## Setup Steps

### 1. Update `.env` File

Open `server/.env` and replace the placeholders:

```env
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@dkrestaurent.va5lhmg.mongodb.net/foodie-dash?retryWrites=true&w=majority&appName=DKrestaurent
```

**Important:**
- Replace `YOUR_USERNAME` with your Atlas database username
- Replace `YOUR_PASSWORD` with your Atlas database password

### 2. URL Encode Your Password

If your password contains special characters, you must URL encode them:

| Character | Encoded |
|-----------|---------|
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `/` | `%2F` |
| `&` | `%26` |
| `+` | `%2B` |
| `=` | `%3D` |

**Example:**
```
Password: MyP@ss#123
Encoded:  MyP%40ss%23123

Connection String:
mongodb+srv://admin:MyP%40ss%23123@dkrestaurent.va5lhmg.mongodb.net/foodie-dash?retryWrites=true&w=majority&appName=DKrestaurent
```

**Quick URL Encoder:** [https://www.urlencoder.org/](https://www.urlencoder.org/)

### 3. Database Name

The connection string includes `/foodie-dash` as the database name. If you want to use a different name, change it:

```
...mongodb.net/your-database-name?retryWrites...
```

### 4. Verify Network Access

Make sure your IP address is whitelisted in MongoDB Atlas:

1. Go to MongoDB Atlas Dashboard
2. Click "Network Access" → "IP Access List"
3. Add your current IP or `0.0.0.0/0` for all IPs (development only)

### 5. Test Connection

Start your server:

```bash
cd server
npm run dev
```

You should see:
```
✅ Connected to MongoDB
📍 Database: foodie-dash
🌐 Host: dkrestaurent.va5lhmg.mongodb.net
✅ Default admin user created
🚀 Server running on port 5000
```

## Troubleshooting

### Connection Timeout
- Check Network Access IP whitelist in Atlas
- Verify firewall settings
- Check internet connection

### Authentication Failed
- Verify username and password
- URL encode special characters in password
- Check user has correct privileges in Atlas

### Cannot Connect
- Verify connection string format
- Check cluster is running in Atlas dashboard
- Ensure database user exists in "Database Access"

## Security Notes

⚠️ **Never commit `.env` file to Git!**

- `.env` is already in `.gitignore`
- Never share your connection string publicly
- Use strong passwords
- Restrict IP access in production

## Example Complete `.env` File

```env
MONGODB_URI=mongodb+srv://admin:SecurePass123%40@dkrestaurent.va5lhmg.mongodb.net/foodie-dash?retryWrites=true&w=majority&appName=DKrestaurent
PORT=5000
NODE_ENV=development
JWT_SECRET=your-very-strong-jwt-secret-key-here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

---

**Ready to connect!** 🚀 Just update the username and password in `.env` file.

