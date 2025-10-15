# Environment Variables Setup

## Single .env File Location

All environment variables are now consolidated in the **root directory**:
```
Hack-A-Holiday/.env
```

## How It Works

### Backend (backend_test/)
The backend will automatically look for `.env` in the root directory if no local `.env` exists.

If you need a local backend `.env`, create a symlink:
```powershell
# Windows PowerShell (Run as Administrator)
cd backend_test
New-Item -ItemType SymbolicLink -Name ".env" -Target "..\.env"
```

### Frontend (frontend/)
Next.js will automatically load `.env` from the root directory.

If you need a local frontend `.env.local`, create a symlink:
```powershell
# Windows PowerShell (Run as Administrator)
cd frontend
New-Item -ItemType SymbolicLink -Name ".env.local" -Target "..\.env"
```

## Environment Variables Included

✅ **Server Configuration** - Port, CORS, Node environment  
✅ **AWS Configuration** - Region, Account ID, Bedrock  
✅ **AI Models** - Nova Pro, Nova Lite, Claude  
✅ **Database** - DynamoDB tables  
✅ **APIs** - RapidAPI (Kiwi flights, Booking.com hotels)  
✅ **Authentication** - JWT, Google OAuth, Firebase  
✅ **Frontend** - Next.js public variables  

## Important Notes

1. **Never commit `.env` to Git** - Already in `.gitignore`
2. **Keep `.env.example` files** - These are templates for team members
3. **Restart servers after changes** - Changes require server restart to take effect

## Quick Start

1. Make sure `.env` exists in root: `Hack-A-Holiday/.env`
2. Start backend: `cd backend_test && npm run dev`
3. Start frontend: `cd frontend && npm run dev`

Both will automatically use the root `.env` file!
