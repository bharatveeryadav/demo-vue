import multer from 'multer';
import connection from '../config/connectDB.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory name in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '../public/uploadbanners');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Specify the upload directory
  },
  filename: (req, file, cb) => {
    // Save only the filename with timestamp
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Function to upload images and modify or create records
const uploadImages = async (req, res) => {
  try {
    const files = req.files;
    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const imageAddresses = {};
    Object.keys(files).forEach(fieldName => {
      files[fieldName].forEach(file => {
        imageAddresses[fieldName] = file.filename; // Store only the filename
      });
    });

    const updates = Object.entries(imageAddresses)
      .map(([key, value]) => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(imageAddresses)];

    // Check if a record exists (e.g., with `id = 1`)
    const checkSql = `SELECT id FROM images WHERE id = 1`;
    const [checkResult] = await connection.query(checkSql);

    if (checkResult.length > 0) {
      // Record exists, update it
      const sqlUpdate = `UPDATE images SET ${updates} WHERE id = 1`;
      await connection.query(sqlUpdate, values);
    } else {
      // No record found, insert a new one
      const columns = Object.keys(imageAddresses).join(', ');
      const placeholders = Object.keys(imageAddresses).map(() => '?').join(', ');
      const sqlInsert = `INSERT INTO images (id, ${columns}) VALUES (1, ${placeholders})`;
      await connection.query(sqlInsert, [1, ...values]);
    }

    return res.status(200).json({
      message: 'Images uploaded and processed successfully',
      addresses: imageAddresses,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Function to fetch image names from the database
const fetchImageNames = async (req, res) => {
  try {
    const sql = `SELECT * FROM images WHERE id = 1`;
    const [result] = await connection.query(sql);

    if (result.length === 0) {
      return res.status(404).json({ message: 'No images found' });
    }

    const imageNames = result[0];
    delete imageNames.id; // Remove the id field

    return res.status(200).json({
      message: 'Image names fetched successfully',
      imageNames,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
const assetsDir = path.join(__dirname, '../public');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Set up multer for the new upload directory
const assetsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, assetsDir); // Specify the new upload directory
  },
  filename: (req, file, cb) => {
    // Save only the filename with timestamp
    const uniqueName = `${file.originalname}`;
    cb(null, uniqueName);
  },
});

const uploadToAssets = multer({ storage: assetsStorage });

// Function to change a specific image
const changeSpecificImage = async (req, res) => {
  uploadToAssets.single('image')(req, res, (err) => {
    if (err) {
      console.error('Image upload failed:', err.message);
      return res.status(500).json({ message: 'Image upload failed', error: err.message });
    }

    const file = req.file;
    if (!file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const imageName = file.filename;
    console.log('Image uploaded successfully:', imageName);

    return res.status(200).json({
        message: 'Image uploaded successfully',
        imageName,
      });
    });
  };

// Export the new function
const imageController = {
  uploadImages,
  fetchImageNames,
  changeSpecificImage,
};

export default imageController;