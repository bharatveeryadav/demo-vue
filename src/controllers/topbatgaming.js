import express from 'express';
import crypto from 'crypto';
import axios from 'axios';

import middlewareController from './middlewareController.js';

import "dotenv/config";
const app = express();

import connection from "../config/connectDB.js";

const API_URL = process.env.API_URL;
const PID = process.env.PID;  // Replace with your actual Merchant ID
const API_SECRET = process.env.API_SECRET;  // Replace with your actual API secret
const VERSION = process.env.VERSION;

// Function to create MD5 signature
const createSignature = (params) => {
  // Sort parameters by ASCII order of keys and concatenate into `key=value&` format
  const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  
  // Append API_SECRET to the string
  const stringToSign = `${sortedParams}&apikey=${API_SECRET}`;
  
  // Return the MD5 hash of the final string
  return crypto.createHash('md5').update(stringToSign).digest('hex').toUpperCase();
};

// Function to generate a unique transaction ID
const generateTransactionId = () => {
  // Get current timestamp in milliseconds
  const timestamp = Date.now().toString();

  // Generate a random number to add uniqueness
  const randomNum = Math.floor(Math.random() * 100000).toString();

  // Combine them to create a unique transaction ID
  const transactionId = `TXN${timestamp}${randomNum}`;

  return transactionId;
};

// Function to handle deposit
async function handleDeposit(username, balance) {
  // Prepare parameters
  const params = {
    pid: PID,
    ver: VERSION,
    method: 'DEPOSIT',
    username,
    orderid: generateTransactionId(), // Assuming generateOrderId is a function that generates a unique order ID
    amount:  parseFloat(balance)
  };

  console.log('Deposit params:', params);
  // Generate the signature
  params.sign = createSignature(params);

  try {
    // Send the request to the API
    const response = await axios.post(API_URL, params);
    return response.data;  // Return the API response
  } catch (error) {
    throw new Error(`Deposit failed: ${error.message}`);
  }
}

// Registration Route
app.post('/topbetgaming-register', async (req, res) => {
  const { username, org, ip } = req.body;

  // Prepare parameters
  const params = {
    pid: PID,
    ver: VERSION,
    method: 'REGISTER',
    username,
    org,
    ip
  };

  // Generate the signature
  params.sign = createSignature(params);

  try {
    // Send the request to the API
    const response = await axios.post(API_URL, params);
    res.json(response.data);  // Send back the API response to the client
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// Login Route
app.post('/topbetgaming-login', async (req, res) => {
  let auth = req.cookies.auth;
  const [users] = await connection.query(
    "SELECT `name_user`, `money` FROM users WHERE token = ?",
    [auth]
  );

  // Handle case where no user is found
  if (users.length === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const { app_id } = req.body;
  const username = users[0].name_user;
  const balance = users[0].money;
  const ip = "192.168.1.168";
  const lang = 'en';

  try {
    if (balance > 0) {
      // Update user's balance to 0
      await connection.query(
        "UPDATE users SET money = 0 WHERE token = ?",
        [auth]
      );

      // Handle deposit
      const depositResponse = await handleDeposit(username, balance);
      console.log('Deposit Response:', depositResponse);

      // Check if deposit was successful
      if (depositResponse.code !== 0) {
        return res.status(500).json({ error: 'Deposit failed', details: depositResponse.message });
      }
    }

    // Prepare parameters for login
    const params = {
      pid: PID,
      ver: VERSION,
      method: 'LOGIN',
      username,
      app_id,
      ip,
      lang
    };

    // Generate the signature
    params.sign = createSignature(params);

    // Send the request to the API
    const response = await axios.post(API_URL, params);
    res.json(response.data);  // Send back the API response to the client
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});



async function getBalance(username) {
    // Prepare parameters
    const params = {
      pid: PID,
      ver: VERSION,
      method: 'BALANCE',
      username
    };
  
    // Generate the signature
    params.sign = createSignature(params);
  
    try {
      // Send the request to the API
      const response = await axios.post(API_URL, params);
      return response.data;  // Return the API response
    } catch (error) {
      throw new Error(`Balance inquiry failed: ${error.message}`);
    }
  }

// Withdrawal Route
app.post('/topbetgaming-withdraw', async (req, res) => {
  let auth = req.cookies.auth;
  const [users] = await connection.query(
    "SELECT `name_user`, `money` FROM users WHERE token = ?",
    [auth]
  );

  // Handle case where no user is found
  if (users.length === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const username = users[0].name_user;
  const orderid = generateTransactionId().toString();

  const { balance } = await getBalance(username);
  console.log(balance);

  const amount = balance;

  // Ensure amount is a number
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  // Prepare parameters
  const params = {
    pid: PID,
    ver: VERSION,
    method: 'WITHDRAW',
    username: String(username),
    orderid: String(orderid),
    amount: 0 // Ensure amount is formatted as a string with 2 decimal places
  };

  // Generate the signature
  params.sign = createSignature(params);

  // Log the parameters for debugging
  console.log('Parameters sent to API:', params);

  try {
    // Send the request to the API
    const response = await axios.post(API_URL, params);
    console.log('API response:', response.data);
    if (response.data.code === 0) {
      // Add the same amount back to the user's balance
      await connection.query(
        "UPDATE users SET money = money + ? WHERE token = ?",
        [parsedAmount, auth]
      );
    }
    res.json(response.data);  // Send back the API response to the client
  } catch (error) {
    console.error('API request failed:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Withdrawal failed', details: error.message });
  }
});

// Balance Inquiry Route


app.post('/topbetgaming-balance', async (req, res) => {

  let auth = req.cookies.auth;
  const [users] = await connection.query(
    "SELECT `name_user`, `money` FROM users WHERE token = ?",
    [auth]
  );

  // Handle case where no user is found
  if (users.length === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }
  
  const username = users[0].name_user;
  

  // Prepare parameters
  const params = {
    pid: PID,
    ver: VERSION,
    method: 'BALANCE',
    username
  };

  // Generate the signature
  params.sign = createSignature(params);

  try {
    // Send the request to the API
    const response = await axios.post(API_URL, params);
    res.json(response.data);  // Send back the API response to the client
  } catch (error) {
    res.status(500).json({ error: 'Balance inquiry failed', details: error.message });
  }
});


// Export the router
export default app;