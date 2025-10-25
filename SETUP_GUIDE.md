# PRANA - Student Activity Tracking System

## Complete Setup Guide

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation Steps

#### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

This will install:
- **express**: Web server framework
- **sqlite3**: Database
- **cors**: Cross-origin requests
- **body-parser**: JSON parsing

#### 2. Start the Server
\`\`\`bash
npm start
\`\`\`

The server will start on `http://localhost:3000`

You should see:
\`\`\`
PRANA Server running on http://localhost:3000
Database: prana.db
Default Credentials:
Student - Scholar ID: 23144003, Password: password123
Admin - Email: admin@prana.com, Password: admin123
\`\`\`

#### 3. Open in Browser
Open `http://localhost:3000` in your web browser

### Default Login Credentials

**Student Login:**
- Scholar ID: `23144003`
- Password: `password123`

**Admin Login:**
- Email: `admin@prana.com`
- Password: `admin123`

### Features

#### Student Dashboard
- View daily activities
- Mark activities as complete
- Track progress with visual indicators
- Log health status (Excellent, Good, Fair, Not Well)
- View weekly progress

#### Admin Dashboard
- View total students count
- Monitor active students today
- Track completion rates
- View recent student activities
- Real-time statistics

### Database Structure

The system automatically creates SQLite database with these tables:

**students**
- scholar_id (unique)
- name
- password
- hostel
- email

**activities**
- scholar_id (foreign key)
- activity_name
- activity_time
- status (pending/completed)
- date

**health_status**
- scholar_id (foreign key)
- status (Excellent/Good/Fair/Not Well)
- notes
- date

**admins**
- email (unique)
- password
- name

### API Endpoints

#### Student Authentication
- `POST /api/student/login` - Student login
- `POST /api/student/register` - Register new student

#### Activities
- `GET /api/activities/:scholar_id` - Get student activities
- `POST /api/activities` - Create new activity
- `PUT /api/activities/:id` - Update activity status

#### Health Status
- `GET /api/health/:scholar_id` - Get health status
- `POST /api/health` - Log health status

#### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/activities` - Get recent activities
- `GET /api/admin/students` - Get all students

### Adding New Students

To add new students, modify the `seedDefaultData()` function in `server.js` or use the registration endpoint.

### Customization

#### Change Default Port
Edit `server.js`:
\`\`\`javascript
const PORT = process.env.PORT || 3000; // Change 3000 to your port
\`\`\`

#### Add More Activities
Edit the activities array in `seedDefaultData()` function in `server.js`

#### Modify Database
The database file `prana.db` is created automatically. Delete it to reset the database.

### Troubleshooting

**Port Already in Use:**
\`\`\`bash
# Change port in server.js or use environment variable
PORT=3001 npm start
\`\`\`

**Database Locked:**
Delete `prana.db` and restart the server

**CORS Errors:**
Make sure the frontend is accessing `http://localhost:3000` (not a different port)

### Development Mode

For development with auto-restart on file changes:
\`\`\`bash
npm run dev
\`\`\`

This requires `nodemon` to be installed (included in devDependencies)

### Deployment

To deploy to production:

1. Set environment variables:
   \`\`\`bash
   export PORT=8080
   export NODE_ENV=production
   \`\`\`

2. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

3. Use a process manager like PM2:
   \`\`\`bash
   npm install -g pm2
   pm2 start server.js --name "prana"
   \`\`\`

### Support

For issues or questions, check the console logs for error messages.

---

**PRANA v1.0** - Productivity & Routine Activity Noting Application
