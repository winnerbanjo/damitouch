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

// Setup local uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
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

// Database connection
let db;
const client = new MongoClient(process.env.MONGODB_URI);

async function connectDB() {
  try {
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Admin Verification Middleware
const verifyAdmin = (req, res, next) => {
  const password = req.headers['x-admin-password'];
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin credentials' });
  }
  next();
};

// API Routes

// 1. BOOKINGS API
// GET bookings (Admin only)
app.get('/api/bookings', verifyAdmin, async (req, res) => {
  try {
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

    const result = await db.collection('damitouch_properties').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete property' });
  }
});


// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve the homepage for other client requests
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server after connecting to MongoDB
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
});
