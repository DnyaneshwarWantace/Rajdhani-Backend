import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { Agent as httpsAgent } from 'https';
import multer from 'multer';
import path from 'path';

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'product-images';

// S3 API endpoint uses different account ID for API access
const R2_S3_ACCOUNT_ID = process.env.R2_S3_ACCOUNT_ID;
const R2_ENDPOINT = R2_S3_ACCOUNT_ID ? `https://${R2_S3_ACCOUNT_ID}.r2.cloudflarestorage.com` : '';
// Public URL uses the correct account ID for public access
const R2_PUBLIC_ACCOUNT_ID = process.env.R2_PUBLIC_ACCOUNT_ID;
const R2_PUBLIC_URL = R2_PUBLIC_ACCOUNT_ID ? `https://pub-${R2_PUBLIC_ACCOUNT_ID}.r2.dev` : '';

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_S3_ACCOUNT_ID || !R2_PUBLIC_ACCOUNT_ID) {
  console.error('❌ Missing Cloudflare R2 credentials in environment variables!');
  console.error('Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_S3_ACCOUNT_ID, and R2_PUBLIC_ACCOUNT_ID in your .env file');
}

// Initialize S3 client for R2 (only if credentials are available)
let s3Client = null;
if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  // Create HTTPS agent with SSL configuration that works with Cloudflare R2
  const httpsAgentConfig = new httpsAgent({
    keepAlive: true,
    maxSockets: 50,
    rejectUnauthorized: true,
    // Allow all TLS versions (Node.js 20 supports TLS 1.2 and 1.3)
    // Cloudflare R2 requires TLS 1.2 or higher
  });

  // Create request handler with HTTPS agent
  const requestHandler = new NodeHttpHandler({
    httpsAgent: httpsAgentConfig,
    requestTimeout: 30000,
    connectionTimeout: 10000,
  });

  s3Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
    requestHandler: requestHandler,
  });
}

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit (increased for high-res product images)
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File must be an image'), false);
    }
  },
});

// Middleware for single file upload
export const uploadSingle = upload.single('image');

/**
 * Upload image to Cloudflare R2
 */
export const uploadImage = async (req, res) => {
  try {
    // Validate R2 credentials
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_S3_ACCOUNT_ID || !R2_PUBLIC_ACCOUNT_ID) {
      const missing = [];
      if (!R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
      if (!R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
      if (!R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
      if (!R2_S3_ACCOUNT_ID) missing.push('R2_S3_ACCOUNT_ID');
      if (!R2_PUBLIC_ACCOUNT_ID) missing.push('R2_PUBLIC_ACCOUNT_ID');
      
      return res.status(500).json({
        success: false,
        error: `Cloudflare R2 credentials not configured. Missing: ${missing.join(', ')}. Please add these to your .env file and restart the backend.`
      });
    }

    console.log(`📤 Attempting to upload image to bucket: ${R2_BUCKET_NAME}`);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'File must be an image'
      });
    }

    // Validate file size (max 20MB - increased for high-res product images)
    if (req.file.size > 20 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'Image size must be less than 20MB'
      });
    }

    // Get folder from query parameter or default to 'products'
    const folder = req.query.folder || 'products';

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(req.file.originalname) || '.jpg';
    const fileName = `${folder}/${timestamp}-${randomString}${fileExtension}`;

    // Upload to R2
    if (!s3Client) {
      return res.status(500).json({
        success: false,
        error: 'R2 client not initialized. Please check your environment variables.'
      });
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer, // Buffer is available in Node.js
      ContentType: req.file.mimetype,
    });

    await s3Client.send(command);

    // Construct public URL
    // R2 public URL format: https://pub-{account-id}.r2.dev/{key}
    // Note: The bucket name should NOT be in the URL path for public URLs
    // The public URL is just the key (folder/filename)
    const publicUrl = `${R2_PUBLIC_URL}/${fileName}`;
    
    console.log(`✅ Image uploaded successfully to R2: ${fileName}`);
    console.log(`📎 Public URL: ${publicUrl}`);

    return res.status(200).json({
      success: true,
      url: publicUrl,
      key: fileName
    });
  } catch (error) {
    console.error('Error uploading image to R2:', error);
    
    // Provide helpful error message for missing bucket
    let errorMessage = error.message || 'Failed to upload image';
    if (error.Code === 'NoSuchBucket' || error.message?.includes('NoSuchBucket')) {
      errorMessage = `Bucket "${R2_BUCKET_NAME}" does not exist in Cloudflare R2. Please create the bucket in your Cloudflare dashboard first.`;
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Delete image from Cloudflare R2
 */
export const deleteImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Image URL is required'
      });
    }

    // Extract key from URL
    // URL format: https://pub-{account-id}.r2.dev/{folder}/{filename}
    // The bucket name is NOT in the public URL path
    const urlParts = imageUrl.split('/');
    // Find the part after the domain (skip protocol, domain, account-id, r2.dev)
    // URL structure: https://pub-{account-id}.r2.dev/{folder}/{filename}
    const domainIndex = urlParts.findIndex(part => part.includes('r2.dev'));
    const key = domainIndex >= 0 ? urlParts.slice(domainIndex + 1).join('/') : urlParts.slice(-2).join('/');

    // Validate R2 credentials
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_S3_ACCOUNT_ID || !R2_PUBLIC_ACCOUNT_ID) {
      const missing = [];
      if (!R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
      if (!R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
      if (!R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
      if (!R2_S3_ACCOUNT_ID) missing.push('R2_S3_ACCOUNT_ID');
      if (!R2_PUBLIC_ACCOUNT_ID) missing.push('R2_PUBLIC_ACCOUNT_ID');
      
      return res.status(500).json({
        success: false,
        error: `Cloudflare R2 credentials not configured. Missing: ${missing.join(', ')}. Please add these to your .env file and restart the backend.`
      });
    }

    if (!s3Client) {
      return res.status(500).json({
        success: false,
        error: 'R2 client not initialized. Please check your environment variables.'
      });
    }

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting image from R2:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete image'
    });
  }
};

