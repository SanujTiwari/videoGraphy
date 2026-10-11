require("express-async-errors");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const { seedDatabase } = require("./db/seed");
const { setSocketIOInstance } = require("./services/notificationService");
// Import Route Handlers
const authRoutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const packageRoutes = require("./routes/packageRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const customerRoutes = require("./routes/customerRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const inquiryRoutes = require("./routes/inquiryRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const couponRoutes = require("./routes/couponRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const reportRoutes = require("./routes/reportRoutes");
const studioRoutes = require("./routes/studioRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const path = require("path");
dotenv.config();
const app = express();
const server = http.createServer(app);
// Initialize Socket.IO with CORS for real-time manager alerts
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
});
setSocketIOInstance(io);
// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
// Database Initialization & Seed
(async () => {
    try {
        await seedDatabase();
    }
    catch (err) {
        console.error('⚠️  Database initialization error:', err);
        // Don't exit - server can still run without DB
    }
})();
// Socket.IO Connection Event
io.on('connection', (socket) => {
    console.log('[WEBSOCKET CONNECTED] Client ID:', socket.id);
    socket.on('join_manager_room', () => {
        socket.join('managers');
        console.log(`[WEBSOCKET ROOM] Client ${socket.id} joined "managers" room.`);
    });
    socket.on('disconnect', () => {
        console.log('[WEBSOCKET DISCONNECTED] Client ID:', socket.id);
    });
});
// REST API Route Registration
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/admin/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/staff', employeeRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/studio', studioRoutes);
app.use('/api/gallery', galleryRoutes);
// Uploaded photos
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
// Root Status Health Check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ONLINE',
        brand: 'Anmol VideoGraphy',
        platform: 'Wedding Management & Studio Booking Platform',
        timestamp: new Date().toISOString(),
    });
});
// Catches rejected promises from async route handlers
app.use((err, _req, res, _next) => {
    console.error('Unhandled route error:', err?.message || err);
    res.status(500).json({ error: 'Internal server error' });
});
const PORT = process.env.PORT || 5000;
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error('Port ' + PORT + ' is already in use. An old server is still running. Close it (or change PORT in server/.env) and start again.');
        process.exit(1);
    }
    throw err;
});
server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`   🏆 ANMOL VIDEOGRAPHY SERVER RUNNING ON PORT ${PORT}   `);
    console.log(`   API Endpoint: http://localhost:${PORT}/api            `);
    console.log(`=======================================================`);
});
