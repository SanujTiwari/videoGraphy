const cloudinary = require('cloudinary').v2;
const { db } = require('../db/database');

// Cache configuration
let cachedConfig = null;

async function getCloudinaryConfig() {
  // 1. Check process.env first
  const envCloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const envApiKey = process.env.CLOUDINARY_API_KEY;
  const envApiSecret = process.env.CLOUDINARY_API_SECRET;

  if (envCloudName && envApiKey && envApiSecret) {
    return {
      cloud_name: envCloudName.trim(),
      api_key: envApiKey.trim(),
      api_secret: envApiSecret.trim(),
      source: 'env'
    };
  }

  // 2. Check studio_settings table in DB
  try {
    const settings = await db.prepare('SELECT cloudinary_cloud_name, cloudinary_api_key, cloudinary_api_secret FROM studio_settings LIMIT 1').get();
    if (settings && settings.cloudinary_cloud_name && settings.cloudinary_api_key && settings.cloudinary_api_secret) {
      return {
        cloud_name: settings.cloudinary_cloud_name.trim(),
        api_key: settings.cloudinary_api_key.trim(),
        api_secret: settings.cloudinary_api_secret.trim(),
        source: 'database'
      };
    }
  } catch (err) {
    // Column might not exist yet before migration
  }

  return null;
}

async function isConfigured() {
  const config = await getCloudinaryConfig();
  return {
    isConfigured: !!config,
    cloud_name: config ? config.cloud_name : null,
    source: config ? config.source : null
  };
}

async function configureCloudinary() {
  const config = await getCloudinaryConfig();
  if (config) {
    cloudinary.config({
      cloud_name: config.cloud_name,
      api_key: config.api_key,
      api_secret: config.api_secret,
      secure: true
    });
    return true;
  }
  return false;
}

/**
 * Upload an image or video to Cloudinary
 * @param {string} fileData - Base64 data URL (e.g. data:image/jpeg;base64,... or data:video/mp4;base64,...)
 * @param {object} options - { title, category, media_type }
 */
async function uploadMedia(fileData, options = {}) {
  const hasConfig = await configureCloudinary();
  if (!hasConfig) {
    throw new Error('Cloudinary is not configured. Please enter your Cloud Name, API Key and Secret in Settings.');
  }

  const { category = 'Wedding', media_type = 'image', title = 'media' } = options;
  const resource_type = media_type === 'video' ? 'video' : 'image';
  const folder = `anmol_videography/${category.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  const uploadOptions = {
    folder,
    resource_type,
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    tags: ['wedding', category.toLowerCase()]
  };

  const result = await cloudinary.uploader.upload(fileData, uploadOptions);

  return {
    url: result.secure_url,
    public_id: result.public_id,
    resource_type: result.resource_type,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    duration: result.duration || null
  };
}

/**
 * Delete a media file from Cloudinary by its public_id
 * @param {string} public_id - Cloudinary asset public_id
 * @param {string} media_type - 'image' or 'video'
 */
async function deleteMedia(public_id, media_type = 'image') {
  if (!public_id) return false;
  const hasConfig = await configureCloudinary();
  if (!hasConfig) return false;

  const resource_type = media_type === 'video' ? 'video' : 'image';
  try {
    const result = await cloudinary.uploader.destroy(public_id, { resource_type });
    return result.result === 'ok';
  } catch (err) {
    console.error('Failed to destroy Cloudinary asset:', err.message);
    return false;
  }
}

module.exports = {
  isConfigured,
  getCloudinaryConfig,
  uploadMedia,
  deleteMedia
};
