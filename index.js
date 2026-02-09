const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// --- Global Configuration & Cache ---
let conn = null;

const S3_BUCKET = process.env.S3_BUCKET_NAME;
const S3_REGION = process.env.S3_REGION || 'eu-north-1';
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5001;
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
  stock: { type: Number, default: 0 }, // Inventory tracking
  isAvailable: { type: Boolean, default: true }, // Quick toggle
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
    name: { type: String }, // Store item name for historical accuracy
    quantity: { type: Number, default: 1 },
    priceAtOrder: { type: Number }
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'preparing', 'served', 'paid'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

// Use existing models if already compiled
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

    // Check if admin exists
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
  getAll: async (event) => {
    const params = event.queryStringParameters || {};
    const query = {};

    if (params.category) query.category = params.category;
    if (params.search) query.name = { $regex: params.search, $options: 'i' };
    if (params.available === 'true') query.isAvailable = true;

    const items = await Menu.find(query).sort({ createdAt: -1 });
    return sendResponse(200, items);
  },

  createBulk: async (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      return sendResponse(400, { error: 'Invalid input: Expected an array of items' });
    }

    // Basic validation and formatting
    const validItems = items.map(item => ({
      name: item.name,
      description: item.description || '',
      price: Number(item.price),
      category: item.category || 'Uncategorized',
      imageUrl: item.imageUrl || '', // Optional
    })).filter(item => item.name && !isNaN(item.price));

    if (validItems.length === 0) {
      return sendResponse(400, { error: 'No valid items found to insert' });
    }

    const result = await Menu.insertMany(validItems);
    return sendResponse(201, { message: 'Bulk import successful', count: result.length, items: result });
  },

  createBulk: async (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      return sendResponse(400, { error: 'Invalid input: Expected an array of items' });
    }

    // Basic validation and formatting
    const validItems = items.map(item => ({
      name: item.name,
      description: item.description || '',
      price: Number(item.price),
      category: item.category || 'Uncategorized',
      imageUrl: item.imageUrl || '', // Optional
    })).filter(item => item.name && !isNaN(item.price));

    if (validItems.length === 0) {
      return sendResponse(400, { error: 'No valid items found to insert' });
    }

    const result = await Menu.insertMany(validItems);
    return sendResponse(201, { message: 'Bulk import successful', count: result.length, items: result });
  },

  create: async (data) => {
    const { name, description, price, category, fileName, fileType } = data;

    const newItem = new Menu({
      name,
      description,
      price,
      category,
      stock: data.stock || 0,
      isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
    });

    const key = `menu/${newItem._id}-${Date.now()}-${fileName}`;
    newItem.imageUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;

    await newItem.save();

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: fileType,
    });
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return sendResponse(201, {
      item: newItem,
      presignedUploadUrl: presignedUrl,
      uploadKey: key
    });
  },

  update: async (id, data) => {
    // Check if new image is being uploaded
    if (data.fileName && data.fileType) {
      const item = await Menu.findById(id);
      if (!item) return sendResponse(404, { error: 'Item not found' });

      // Generate new S3 Key and URL
      const key = `menu/${id}-${Date.now()}-${data.fileName}`;
      const imageUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;

      // Generate Presigned URL
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: data.fileType,
      });
      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

      // Clean payload
      const updatePayload = { ...data, imageUrl };
      delete updatePayload.fileName;
      delete updatePayload.fileType;

      const updated = await Menu.findByIdAndUpdate(id, updatePayload, { new: true });
      return sendResponse(200, {
        ...updated.toObject(),
        presignedUploadUrl: presignedUrl, // Return this for frontend to upload
        uploadKey: key
      });
    }

    // Standard update (no image change)
    const updated = await Menu.findByIdAndUpdate(id, data, { new: true });
    if (!updated) return sendResponse(404, { error: 'Item not found' });
    return sendResponse(200, updated);
  },

  delete: async (id) => {
    const item = await Menu.findById(id);
    if (!item) return sendResponse(404, { error: 'Item not found' });

    if (item.imageUrl) {
      try {
        const urlParts = item.imageUrl.split('.com/');
        if (urlParts.length > 1) {
          const key = urlParts[1];
          await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
        }
      } catch (err) {
        console.error('Failed to delete S3 object', err);
      }
    }

    await Menu.findByIdAndDelete(id);
    return sendResponse(200, { message: 'Item deleted' });
  }
};

const orderHandlers = {
  getAll: async (event) => {
    const params = event.queryStringParameters || {};
    const query = {};

    if (params.status) query.status = params.status;
    if (params.startDate && params.endDate) {
      query.createdAt = {
        $gte: new Date(params.startDate),
        $lte: new Date(params.endDate)
      };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    return sendResponse(200, orders);
  },

  getOne: async (id) => {
    const order = await Order.findById(id).populate('items.menuId');
    if (!order) return sendResponse(404, { error: 'Order not found' });
    return sendResponse(200, order);
  },

  update: async (id, data) => {
    const { status } = data;
    const order = await Order.findById(id);
    if (!order) return sendResponse(404, { error: 'Order not found' });

    // Strict Status Transitions
    const validTransitions = {
      pending: ['preparing', 'cancelled'],
      preparing: ['served', 'cancelled'],
      served: ['paid', 'cancelled'],
      paid: [], // Terminal state
      cancelled: [] // Terminal state
    };

    const allowed = validTransitions[order.status];
    if (status && !allowed.includes(status) && order.status !== status) {
      // Allow admin to force update if needed? For now strict.
      // Actually, let's allow going to 'cancelled' from anywhere just in case, 
      // but the map above handles it.
      // What if we need to revert? e.g. paid -> pending (mistake).
      // Real productions usually don't allow reverting simple status, you have to refund.
      // But for this app, maybe we act strict or allow 'admin override'.
      // Let's stick to the requested validation.
      return sendResponse(400, {
        error: `Invalid status transition from ${order.status} to ${status}. Allowed: ${allowed.join(', ')}`
      });
    }

    // If updating status, proceed
    if (status) order.status = status;

    // We can also allow updating other fields if needed, but primarily status for this handler.
    await order.save();
    return sendResponse(200, order);
  },

  create: async (data) => {
    const { items, customerName, customerPhone, deliveryAddress, userId, totalAmount } = data;

    if (!items || items.length === 0) return sendResponse(400, { error: 'No items in order' });

    // 1. Validate Stock and Calculate Price
    const orderItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const menuId = item.id || item.menuId || item._id; // Handle various inputs
      const menuItem = await Menu.findById(menuId);

      if (!menuItem) {
        return sendResponse(400, { error: `Menu item not found: ${item.name}` });
      }

      if (!menuItem.isAvailable) {
        return sendResponse(400, { error: `Item is currently unavailable: ${menuItem.name}` });
      }

      if (menuItem.stock < item.quantity) {
        return sendResponse(400, { error: `Insufficient stock for: ${menuItem.name}. Available: ${menuItem.stock}` });
      }

      // Decrement Inventory
      menuItem.stock -= item.quantity;
      if (menuItem.stock === 0) menuItem.isAvailable = false; // Auto-disable if 0? Optional.
      await menuItem.save();

      orderItems.push({
        menuId: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        priceAtOrder: menuItem.price // Snapshot price
      });
      calculatedTotal += menuItem.price * item.quantity;
    }

    const newOrder = await Order.create({
      userId,
      customerName,
      customerPhone,
      deliveryAddress,
      items: orderItems,
      totalAmount: calculatedTotal, // Use calculated total for security
      status: 'pending' // Default
    });

    return sendResponse(201, newOrder);
  },

  getMyOrders: async (userId) => {
    // Fetch orders for a specific user ID, sorted by newest first
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    return sendResponse(200, orders);
  }
};

// --- Main Handler ---

exports.handler = async (event) => {
  try {
    // Check Critical Env Vars
    if (!MONGO_URI) {
      return sendResponse(500, { error: 'Configuration Error', details: 'MONGO_URI is missing in Lambda Environment Variables.' });
    }

    await connectDB();

    let method = event.httpMethod;
    let path = event.path;

    // HTTP API v2 support
    if (!method && event.requestContext && event.requestContext.http) {
      method = event.requestContext.http.method;
      path = event.rawPath;
    }

    if (!path) path = '';

    const httpMethod = method;
    console.log(`Processing: ${httpMethod} ${path}`);

    const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;
    const isRoute = (p) => cleanPath === p || cleanPath.endsWith(p);

    // --- Global CORS ---
    if (httpMethod === 'OPTIONS') {
      return sendResponse(200, {});
    }

    // --- Public Routes ---
    if (httpMethod === 'GET' && isRoute('/menu')) return await menuHandlers.getAll(event);
    if (httpMethod === 'POST' && isRoute('/auth/register')) return await authHandlers.register(parseBody(event));
    if (httpMethod === 'POST' && isRoute('/auth/login')) return await authHandlers.login(parseBody(event));
    if (httpMethod === 'POST' && isRoute('/auth/user/register')) return await authHandlers.registerUser(parseBody(event));
    if (httpMethod === 'POST' && isRoute('/auth/user/login')) return await authHandlers.loginUser(parseBody(event));
    if (httpMethod === 'POST' && isRoute('/orders')) return await orderHandlers.create(parseBody(event));

    // --- Protected Routes ---
    let user;
    try {
      user = verifyToken(event);
    } catch (err) {
      if (httpMethod === 'OPTIONS') return sendResponse(200, {});
      return sendResponse(401, { error: 'Unauthorized: ' + err.message });
    }

    const getIdFromPath = () => {
      if (event.pathParameters && event.pathParameters.id) return event.pathParameters.id;
      const parts = cleanPath.split('/');
      return parts[parts.length - 1]; // Assume last part is ID
    };

    // POST /menu/bulk (Import)
    if (httpMethod === 'POST' && isRoute('/menu/bulk')) {
      return await menuHandlers.createBulk(parseBody(event));
    }

    // GET /orders/mine (Customer History)
    if (httpMethod === 'GET' && isRoute('/orders/mine')) {
      return await orderHandlers.getMyOrders(user.userId);
    }

    // POST /menu/bulk (Import)
    if (httpMethod === 'POST' && isRoute('/menu/bulk')) {
      return await menuHandlers.createBulk(parseBody(event));
    }

    // --- Admin Routes ---
    if (httpMethod === 'GET' && isRoute('/admins')) return await authHandlers.getAll();
    if (httpMethod === 'DELETE' && cleanPath.includes('/admins/') && !isRoute('/admins')) return await authHandlers.delete(getIdFromPath());
    // POST /menu (Create) - Strict match
    if (httpMethod === 'POST' && isRoute('/menu')) return await menuHandlers.create(parseBody(event));
    if (httpMethod === 'PUT' && cleanPath.includes('/menu/') && !isRoute('/menu')) return await menuHandlers.update(getIdFromPath(), parseBody(event));
    if (httpMethod === 'DELETE' && cleanPath.includes('/menu/') && !isRoute('/menu')) return await menuHandlers.delete(getIdFromPath());
    if (httpMethod === 'GET' && isRoute('/orders')) return await orderHandlers.getAll(event);
    if (httpMethod === 'GET' && cleanPath.includes('/orders/') && !isRoute('/orders')) return await orderHandlers.getOne(getIdFromPath());
    if (httpMethod === 'PUT' && cleanPath.includes('/orders/') && !isRoute('/orders')) return await orderHandlers.update(getIdFromPath(), parseBody(event));

    return sendResponse(404, { error: `Route not found: ${httpMethod} ${path}` });

  } catch (error) {
    console.error('FATAL ERROR:', error);
    return sendResponse(500, { error: 'Internal Server Error', details: error.message, stack: error.stack });
  }
};
