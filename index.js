const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {                 
    openapi: '3.0.0',
    info: {
      title: 'GTS Node Service API',
      version: '1.0.0',
      description: 'API docs for GTS Node Service'
    },
    servers: [{ url: 'http://localhost:3000' }],
  },
  apis: [path.join(__dirname, './routes/**/*.js'), path.join(__dirname, './controllers/**/*.js')]
};

const swaggerSpec = swaggerJsdoc(options);


const cartRoutes = require('./routes/cartRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const redisOptions = {
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};
const cartDataClient = new Redis(process.env.REDIS_CART_URL, {
  ...redisOptions,
  keyPrefix: 'cart:'
});

const inventoryReadClient = new Redis(process.env.REDIS_INVENTORY_URL, {
  ...redisOptions,
  readOnly: true
});

const cartPubClient = new Redis(process.env.REDIS_CART_URL, redisOptions);
const cartSubClient = new Redis(process.env.REDIS_CART_URL, redisOptions);

const handleRedisError = (err, type) => console.error(`Redis ${type} Error:`, err);
cartDataClient.on('error', (err) => handleRedisError(err, 'Cart Data Client'));
inventoryReadClient.on('error', (err) => handleRedisError(err, 'Inventory Read Client'));
cartPubClient.on('error', (err) => handleRedisError(err, 'Cart Pub Client'));
cartSubClient.on('error', (err) => handleRedisError(err, 'Cart Sub Client'));

const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL],
    methods: ["GET", "POST"],
    credentials: true
  },
});


app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(morgan('combined'));
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;            
  req.redis = cartDataClient;
  req.inventoryRedis = inventoryReadClient;
  next();
});


app.use('/cart/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/cart/health', async (req, res) => {
  try {
    await Promise.all([
        cartDataClient.ping(),
        cartPubClient.ping()
    ]);
    res.status(200).json({ status: 'ok', service: 'gts-cart-service', db: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ status: 'error', service: 'gts-cart-service', db: 'disconnected' });
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
    console.log('Starting GTS Cart Service...');
    await Promise.all([
      cartDataClient.connect(),
      inventoryReadClient.connect(),
      cartPubClient.connect(),
      cartSubClient.connect()
    ]);
    console.log('✅ All Redis Clients Connected');
    io.adapter(createAdapter(cartPubClient, cartSubClient));
    console.log('✅ Socket.IO Redis Adapter Configured');

    server.listen(PORT, () => {
      console.log(`🚀 Cart Service running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

start();

const gracefulShutdown = async (signal) => {
  console.log(`${signal} received. Closing resources...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      io.disconnectSockets(); 
      await Promise.all([
        cartDataClient.quit(),
        inventoryReadClient.quit(),
        cartPubClient.quit(),
        cartSubClient.quit()
      ]);
      console.log('Redis connections closed.');  
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
