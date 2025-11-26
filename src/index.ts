import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import compression from 'compression';
import foodItemsRoutes from './routes/foodItems';
import categoriesRoutes from './routes/categories';
import ordersRoutes from './routes/orders';
import restaurantsRoutes from './routes/restaurants';
import usersRoutes from './routes/users';
import authRoutes from './routes/auth';
import offersRoutes from './routes/offers';
import deliveryZonesRoutes from './routes/deliveryZones';
import restaurantBrandRoutes from './routes/restaurantBrand';
import adminRoutes from './routes/admin';
import tablesRoutes from './routes/tables';
import reviewsRoutes from './routes/reviews';
import groupOrdersRoutes from './routes/groupOrders';
import User from './models/User';

dotenv.config();

async function seedAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const adminUser = new User({
        name: 'Admin User',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      });
      await adminUser.save();
      console.log('✅ Default admin user created');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
    } else {
      console.log('ℹ️  Admin user already exists');
    }
  } catch (error: any) {
    console.error('⚠️  Error seeding admin user:', error.message);
  }
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Attach io to request object
app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_group', (groupCode) => {
    socket.join(`group_${groupCode}`);
    console.log(`Socket ${socket.id} joined group ${groupCode}`);
  });

  socket.on('table_connected', (tableNumber) => {
    console.log(`Table ${tableNumber} connected`);
    io.emit('admin:table_connected', { tableNumber, timestamp: new Date() });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
//const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodie-dash';


// Middleware
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:5173', 'http://localhost:8080'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Routes
app.use('/api/food-items', foodItemsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/restaurants', restaurantsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/delivery-zones', deliveryZonesRoutes);
app.use('/api/restaurant-brand', restaurantBrandRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/group-orders', groupOrdersRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});


// Connect to MongoDB with improved connection options
mongoose.connect(MONGODB_URI, {
  // Connection pool settings for better performance
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  // Enable retry logic
  retryWrites: true,
  w: 'majority'
})
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    console.log(`📍 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    // Seed admin user
    await seedAdminUser();


    // ... (existing routes)

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Network access: http://192.168.1.110:${PORT}`);
      console.log(`🔌 Socket.IO enabled`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    console.error('💡 Tip: Check your MONGODB_URI in .env file');
    console.error('💡 Tip: For MongoDB Atlas, verify IP whitelist and credentials');
    process.exit(1);
  });

export default app;
