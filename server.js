const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Setup uploads folder. Vercel serverless functions can only write to /tmp.
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serverless-friendly Database Connection caching
let db = null;
let client = null;

async function connectDB() {
  if (db) return db;
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
  }
  db = client.db(process.env.MONGODB_DB);
  return db;
}

// Admin Verification Middleware (with fallback password 'DamiTouch2026')
const verifyAdmin = (req, res, next) => {
  const password = req.headers['x-admin-password'];
  const expectedPassword = process.env.ADMIN_PASSWORD || 'DamiTouch2026';
  if (!password || password !== expectedPassword) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin credentials' });
  }
  next();
};

// API Routes

// Admin password verification. Keep this separate from data reads so login does
// not fail just because the database is temporarily unavailable.
app.get('/api/admin/verify', verifyAdmin, (req, res) => {
  res.json({ success: true });
});

// 1. BOOKINGS API
// GET bookings (Admin only)
app.get('/api/bookings', verifyAdmin, async (req, res) => {
  try {
    const db = await connectDB();
    const bookings = await db.collection('damitouch_bookings')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(bookings);
  } catch (error) {
    console.error('Error retrieving bookings:', error);
    res.status(500).json({ error: 'Failed to retrieve bookings', details: error.message });
  }
});

// POST booking (Public)
app.post('/api/bookings', async (req, res) => {
  try {
    const { name, phone, checkin, checkout, guests, method, notes } = req.body;

    if (!name || !phone || !checkin || !checkout || !guests || !method) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }

    if (new Date(checkout) <= new Date(checkin)) {
      return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }

    const booking = {
      name,
      phone,
      checkin,
      checkout,
      guests: Number(guests),
      method,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    const db = await connectDB();
    const result = await db.collection('damitouch_bookings').insertOne(booking);
    res.status(201).json({ success: true, bookingId: result.insertedId, booking });
  } catch (error) {
    console.error('Error saving booking:', error);
    res.status(500).json({ error: 'Failed to save booking', details: error.message });
  }
});

// DELETE all bookings (Admin only)
app.delete('/api/bookings', verifyAdmin, async (req, res) => {
  try {
    const db = await connectDB();
    await db.collection('damitouch_bookings').deleteMany({});
    res.json({ success: true, message: 'All bookings cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear bookings' });
  }
});


// 2. PROPERTIES API
// GET all properties (Public)
app.get('/api/properties', async (req, res) => {
  try {
    const db = await connectDB();
    const properties = await db.collection('damitouch_properties')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(properties);
  } catch (error) {
    console.error('Error retrieving properties:', error);
    res.status(500).json({ error: 'Failed to retrieve properties', details: error.message });
  }
});

// POST property (Admin only - handles optional local image upload and uploads to Cloudinary)
app.post('/api/properties', verifyAdmin, upload.single('imageFile'), async (req, res) => {
  try {
    const { name, location, price, status } = req.body;
    let imageUrl = req.body.image || '';

    if (!name || !location || !price) {
      // Clean up uploaded file if validation fails
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Missing required property fields (name, location, price)' });
    }

    // Upload to Cloudinary if image file was uploaded
    if (req.file) {
      try {
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          folder: 'damitouch_listings'
        });
        imageUrl = uploadResult.secure_url;
        // Delete the local file after uploading
        fs.unlinkSync(req.file.path);
      } catch (cloudinaryError) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: 'Cloudinary image upload failed' });
      }
    }

    const property = {
      name,
      location,
      price,
      status: status || 'Available',
      image: imageUrl,
      createdAt: new Date().toISOString()
    };

    const db = await connectDB();
    const result = await db.collection('damitouch_properties').insertOne(property);
    res.status(201).json({ success: true, propertyId: result.insertedId, property });
  } catch (error) {
    console.error('Error saving property:', error);
    res.status(500).json({ error: 'Failed to save property', details: error.message });
  }
});

// DELETE a property by ID (Admin only)
app.delete('/api/properties/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid property ID format' });
    }

    const db = await connectDB();
    const result = await db.collection('damitouch_properties').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete property' });
  }
});


// Serve static files from /public (only when running locally; Vercel handles public files via vercel.json routes)
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve the homepage for other client requests (only when running locally)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Only listen to PORT when running locally (not in serverless environment)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

// Export for Vercel Serverless Functions
module.exports = app;
