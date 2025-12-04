const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');

// Import Routes
const cartRoutes = require('./routes/cartRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const REDIS_CART_URL = process.env.REDIS_CART_URL;
const cartRedis = new Redis(REDIS_CART_URL, {
    keyPrefix: 'cart:', 
    lazyConnect: true 
});
const inventoryRedis = new Redis(process.env.REDIS_INVENTORY_URL, {
    lazyConnect: true,
    readOnly: true 
});

const pubClient = new Redis(REDIS_CART_URL);
const subClient = pubClient.duplicate();

const handleRedisError = (err, type) => console.error(`Redis ${type} Error:`, err);
cartRedis.on('error', (err) => handleRedisError(err, 'Data Client'));
pubClient.on('error', (err) => handleRedisError(err, 'Pub Client'));
subClient.on('error', (err) => handleRedisError(err, 'Sub Client'));

const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL],
    methods: ["GET", "POST"],
    credentials: true
  },
  adapter: createAdapter(pubClient, subClient)
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(morgan('combined'));
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;            
  req.redis = cartRedis;
  req.inventoryRedis = inventoryRedis;
  next();
});

app.get('/cart/health', async (req, res) => {
  try {
    await cartRedis.ping(); 
    res.status(200).json({ status: 'ok', service: 'gts-cart-service', db: 'redis-connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'gts-cart-service', db: 'redis-disconnected' });
  }
});

app.use('/cart', cartRoutes);

const initializeSocket = require('./services/socketService');
initializeSocket(io);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

const start = async () => {
    try {
        await Promise.all([
            cartRedis.connect(),
            inventoryRedis.connect()
        ]);
        console.log('Connected to Redis for Cart Storage');
        server.listen(PORT, () => {
            console.log(`Cart Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

start();

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing connections...');
  server.close(() => {
    cartRedis.quit();
    pubClient.quit();
    subClient.quit();
    process.exit(0);
  });
});
