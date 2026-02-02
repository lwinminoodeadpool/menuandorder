import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// --- Global Configuration & Cache ---
let conn = null;

const S3_BUCKET = process.env.S3_BUCKET_NAME;
const S3_REGION = process.env.S3_REGION || 'eu-north-1';
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// Initialize S3 Client
// We use custom env vars (MY_...) to avoid AWS Lambda reserved key errors
const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// --- Mongoose Models ---

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const MenuSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  imageUrl: { type: String }, // Stores the S3 Key or full URL
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional (Guest vs User)
  customerName: { type: String, required: true },
  customerPhone: { type: String },
  deliveryAddress: { type: String },
  customerTable: { type: String }, // Optional for dine-in
  items: [{
    menuId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu' },
    quantity: { type: Number, default: 1 },
    priceAtOrder: { type: Number }
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'preparing', 'served', 'paid'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

// Use existing models if already compiled (for HMR/Lambda cold start edge cases)
const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Menu = mongoose.models.Menu || mongoose.model('Menu', MenuSchema);
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// --- Helpers ---

const connectDB = async () => {
  if (conn == null) {
    console.log('Creating new MongoDB connection...');
    conn = await mongoose.connect(MONGO_URI, {
      bufferCommands: false, // Disable Mongoose buffering
    });
    console.log('MongoDB connected.');
  } else {
    console.log('Using cached MongoDB connection.');
  }
  return conn;
};

const sendResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // CORS
      'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(body),
  };
};

const parseBody = (event) => {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return {};
  }
};

const verifyToken = (event) => {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid Token');
  }
};

// --- Route Handlers ---

const authHandlers = {
  register: async (data) => {
    const { email, password } = data;
    if (!email || !password) return sendResponse(400, { error: 'Missing credentials' });

    // Check if admin exists (Optional: Restrict to one admin or specific logic)
    const existing = await Admin.findOne({ email });
    if (existing) return sendResponse(400, { error: 'Admin already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await Admin.create({ email, password: hashedPassword });

    return sendResponse(201, { message: 'Admin registered successfully', id: newAdmin._id });
  },

  login: async (data) => {
    const { email, password } = data;
    const admin = await Admin.findOne({ email });
    if (!admin) return sendResponse(401, { error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return sendResponse(401, { error: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: '1d' });
    return sendResponse(200, { token });
  },

  registerUser: async (data) => {
    const { name, email, password, phone, address } = data;
    if (!email || !password || !name) return sendResponse(400, { error: 'Missing required fields' });

    const existing = await User.findOne({ email });
    if (existing) return sendResponse(400, { error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword, phone, address });

    // Generate token immediately for convenience
    const token = jwt.sign({ id: newUser._id, email: newUser.email, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });

    return sendResponse(201, {
      message: 'User registered successfully',
      token,
      user: { name, email, phone, address }
    });
  },

  loginUser: async (data) => {
    const { email, password } = data;
    const user = await User.findOne({ email });
    if (!user) return sendResponse(401, { error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return sendResponse(401, { error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, email: user.email, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
    return sendResponse(200, {
      token,
      user: { name: user.name, email: user.email, phone: user.phone, address: user.address }
    });
  },

  getAll: async () => {
    const admins = await Admin.find({}, '-password').sort({ createdAt: -1 });
    return sendResponse(200, admins);
  },

  delete: async (id) => {
    await Admin.findByIdAndDelete(id);
    return sendResponse(200, { message: 'Admin deleted' });
  }
};

const menuHandlers = {
  getAll: async () => {
    const items = await Menu.find().sort({ createdAt: -1 });
    return sendResponse(200, items);
  },

  create: async (data) => {
    const { name, description, price, category, fileName, fileType } = data;

    // Create DB Entry first (or generate ID to use as key)
    const newItem = new Menu({
      name,
      description,
      price,
      category,
      // We will assume the image URL based on the key we are about to generate
    });

    // Generate specific key for S3
    const key = `menu/${newItem._id}-${Date.now()}-${fileName}`;
    newItem.imageUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;

    await newItem.save();

    // Generate Presigned URL
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: fileType,
    });
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 mins

    return sendResponse(201, {
      item: newItem,
      presignedUploadUrl: presignedUrl,
      uploadKey: key
    });
  },

  update: async (id, data) => {
    const updated = await Menu.findByIdAndUpdate(id, data, { new: true });
    if (!updated) return sendResponse(404, { error: 'Item not found' });
    return sendResponse(200, updated);
  },

  delete: async (id) => {
    const item = await Menu.findById(id);
    if (!item) return sendResponse(404, { error: 'Item not found' });

    // Optional: Delete from S3 if imageUrl is stored and matches pattern
    if (item.imageUrl) {
      try {
        // Extract key from URL if possible, or just skip if complex
        const urlParts = item.imageUrl.split('.com/');
        if (urlParts.length > 1) {
          const key = urlParts[1];
          await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
        }
      } catch (err) {
        console.error('Failed to delete S3 object', err);
        // Continue to delete DB record anyway
      }
    }

    await Menu.findByIdAndDelete(id);
    return sendResponse(200, { message: 'Item deleted' });
  }
};

const orderHandlers = {
  getAll: async () => {
    const orders = await Order.find().sort({ createdAt: -1 });
    return sendResponse(200, orders);
  },

  getOne: async (id) => {
    const order = await Order.findById(id).populate('items.menuId');
    if (!order) return sendResponse(404, { error: 'Order not found' });
    return sendResponse(200, order);
  },

  update: async (id, data) => {
    // Basic validation or specific field updates can go here
    const { status } = data;
    const updated = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return sendResponse(404, { error: 'Order not found' });
    return sendResponse(200, updated);
  },

  create: async (data) => {
    const { items, customerName, customerPhone, deliveryAddress, userId, totalAmount } = data;

    if (!items || items.length === 0) return sendResponse(400, { error: 'No items in order' });

    const newOrder = await Order.create({
      userId,
      customerName,
      customerPhone,
      deliveryAddress,
      items,
      totalAmount,
      status: 'pending' // Default
    });

    return sendResponse(201, newOrder);
  }
};

// --- Main Handler ---

export const handler = async (event) => {
  // Make sure to wait for the event loop content to finish (e.g. DB connection)
  // AWS context.callbackWaitsForEmptyEventLoop = false; // Usually handled by returning response

  try {
    await connectDB();

    // --- Normalize Event (Handle HTTP API v2 vs REST/v1) ---
    let method = event.httpMethod;
    let path = event.path;

    // HTTP API v2 support
    if (!method && event.requestContext && event.requestContext.http) {
      method = event.requestContext.http.method;
      path = event.rawPath;
    }

    // Default to empty if missing (avoids crash, though route will 404)
    if (!path) path = '';

    // Assign to common variables used below
    const httpMethod = method; // Code below uses 'httpMethod'

    console.log(`Processing: ${httpMethod} ${path}`);

    // Normalized path (API Gateway might pass different properties depending on usage)
    // We strip stage prefixes or just check 'endsWith' to be safe against different Gateway configs
    const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;

    // Helper to check route
    const isRoute = (p) => cleanPath === p || cleanPath.endsWith(p);

    // --- Global CORS Preflight Handler ---
    if (httpMethod === 'OPTIONS') {
      return sendResponse(200, {});
    }

    // --- Public Routes ---

    // GET /menu
    if (httpMethod === 'GET' && isRoute('/menu')) {
      return await menuHandlers.getAll();
    }

    // POST /auth/register
    if (httpMethod === 'POST' && isRoute('/auth/register')) {
      return await authHandlers.register(parseBody(event));
    }

    // POST /auth/login
    if (httpMethod === 'POST' && isRoute('/auth/login')) {
      return await authHandlers.login(parseBody(event));
    }

    // --- Customer Auth Routes ---

    // POST /auth/user/register
    if (httpMethod === 'POST' && isRoute('/auth/user/register')) {
      return await authHandlers.registerUser(parseBody(event));
    }

    // POST /auth/user/login
    if (httpMethod === 'POST' && isRoute('/auth/user/login')) {
      return await authHandlers.loginUser(parseBody(event));
    }

    // POST /orders (Public - Guest/User Checkout)
    if (httpMethod === 'POST' && isRoute('/orders')) {
      return await orderHandlers.create(parseBody(event));
    }

    // --- Protected Routes (Middleware Check) ---

    let user;
    try {
      user = verifyToken(event);
    } catch (err) {
      if (httpMethod === 'OPTIONS') return sendResponse(200, {});
      console.log('Auth Failed:', err.message); // Debug log
      return sendResponse(401, { error: 'Unauthorized: ' + err.message });
    }

    // --- Dynamic Route Helper (Defined BEFORE usage) ---
    // Extract ID from path if not in pathParameters (for /{proxy+} integration)
    const getIdFromPath = () => {
      if (event.pathParameters && event.pathParameters.id) return event.pathParameters.id;
      const parts = cleanPath.split('/');
      return parts[parts.length - 1]; // Assume last part is ID
    };

    // --- Admin Management Routes ---

    // GET /admins
    if (httpMethod === 'GET' && isRoute('/admins')) {
      return await authHandlers.getAll();
    }

    // DELETE /admins/:id
    if (httpMethod === 'DELETE' && cleanPath.includes('/admins/') && !isRoute('/admins')) {
      return await authHandlers.delete(getIdFromPath());
    }

    // POST /menu (Create) - Strict match
    if (httpMethod === 'POST' && isRoute('/menu')) {
      return await menuHandlers.create(parseBody(event));
    }

    // PUT /menu/:id
    if (httpMethod === 'PUT' && cleanPath.includes('/menu/') && !isRoute('/menu')) {
      return await menuHandlers.update(getIdFromPath(), parseBody(event));
    }

    // DELETE /menu/:id
    if (httpMethod === 'DELETE' && cleanPath.includes('/menu/') && !isRoute('/menu')) {
      return await menuHandlers.delete(getIdFromPath());
    }

    // GET /orders
    if (httpMethod === 'GET' && isRoute('/orders')) {
      return await orderHandlers.getAll();
    }

    // GET /orders/:id
    if (httpMethod === 'GET' && cleanPath.includes('/orders/') && !isRoute('/orders')) {
      return await orderHandlers.getOne(getIdFromPath());
    }

    // PUT /orders/:id (Update Status)
    if (httpMethod === 'PUT' && cleanPath.includes('/orders/') && !isRoute('/orders')) {
      return await orderHandlers.update(getIdFromPath(), parseBody(event));
    }

    return sendResponse(404, { error: `Route not found: ${httpMethod} ${path}` });

  } catch (error) {
    console.error('FATAL ERROR:', error);
    return sendResponse(500, { error: 'Internal Server Error', details: error.message, stack: error.stack });
  }
};
