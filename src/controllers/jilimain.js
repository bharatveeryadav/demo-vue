import express from 'express';
import crypto from 'crypto';
import axios from 'axios';

import "dotenv/config";
const app = express();

import connection from "../config/connectDB.js";

import moment from 'moment-timezone';


// Configuration variables
const API_URL = process.env.API_URL_JILI; // Replace with your API URL
const AGENT_KEY = process.env.AGENT_KEY_JILI; // Replace with your Agent Key
const AGENT_ID = process.env.AGENT_ID_JILI; // Replace with your Agent ID

// Utility function to generate MD5 hash
const md5 = (data) => crypto.createHash("md5").update(data).digest("hex");


const getFormattedDateInUTC4 = () => {
    const now = moment().tz('America/Puerto_Rico'); // Using Puerto Rico as an example for UTC-4
    const year = now.year().toString().slice(-2);
    const month = now.month() + 1; // month() returns 0-11, so add 1
    const day = now.date();
  
    // Construct the date string without zero-padding
    const formattedDate = `${year}${month}${day}`;
    return formattedDate;
  };


const generateTransactionId = () => {
    // Get current timestamp in milliseconds
    const timestamp = Date.now().toString();
  
    // Generate a random number to add uniqueness
    const randomNum = Math.floor(Math.random() * 100000).toString();
  
    // Combine them to create a unique transaction ID
    const transactionId = `TXN${timestamp}${randomNum}`;
  
    return transactionId;
  };


  
const topbetgamingregister = async (Account,Balance) => {
    // Define the test user data
    const testUserData = {
      Account: Account,
      TransactionId: generateTransactionId(),
      Amount: Balance,
      TransferType: 2,
    };
  
    // Define the API endpoint URL (change the port if necessary)
    const url = `${process.env.DOMAIN}/jiligames/jilireal-exchange-transfer`; // Update with your actual endpoint
  
  
    try {
      // Make the POST request
      const response = await axios.post(url, testUserData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      // Log the response
      console.log('Response data:', response.data);
    } catch (error) {
      console.error('Error during the request:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
    }
  };


  
const withdrawjili = async (Account,Balance) => {
  // Define the test user data
  const testUserData = {
    Account: Account,
    TransactionId: generateTransactionId(),
    Amount: Balance,
    TransferType: 1,
  };

  // Define the API endpoint URL (change the port if necessary)
  const url = `${process.env.DOMAIN}/jiligames/jilireal-exchange-transfer`; // Update with your actual endpoint


  try {
    // Make the POST request
    const response = await axios.post(url, testUserData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Log the response
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error during the request:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
};

  // Route to login
app.post("/jilireal-test-login", async (req, res) => {
  try {
    let auth = req.cookies.auth;
    const [users] = await connection.query(
      "SELECT `name_user`, `money`, `phone` FROM users WHERE token = ?",
      [auth]
    );

    // Handle case where no user is found
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const Account = users[0].phone;
    const player_balance = users[0].money;

   const Lang = 'en-US';

    if (player_balance > 0) {
      topbetgamingregister(Account, player_balance)
        .then((response) => { console.log(response); })
        .catch((error) => { console.error(error); });

      // Update the walletAmount in MySQL
      await connection.query(
        "UPDATE users SET money = money - ? WHERE token = ?",
        [player_balance, auth]
      );
    }

    const { GameId } = req.body;
    const now = new Date();
    const formattedDate = getFormattedDateInUTC4();
    const keyG = md5(`${formattedDate}${AGENT_ID}${AGENT_KEY}`);
    const queryString = `Account=${Account}&GameId=${GameId}&Lang=${Lang}&AgentId=${AGENT_ID}`;
    const md5string = md5(`${queryString}${keyG}`);
    const randomPrefix = "123456";
    const randomSuffix = "abcdef";
    const key = `${randomPrefix}${md5string}${randomSuffix}`;
    const requestUrl = `${API_URL}/LoginWithoutRedirect?${queryString}&Key=${key}`;

    const response = await axios.post(requestUrl);
    res.json({
      message: "Request successful",
      requestUrl,
      responseData: response.data,
    });
  } catch (error) {
    console.error("Error occurred:", error.message);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.post("/jilireal-withdraw", async (req, res) => {
  try {
    let auth = req.cookies.auth;
    const [users] = await connection.query(
      "SELECT `name_user`, `money`, `phone` FROM users WHERE token = ?",
      [auth]
    );

    // Handle case where no user is found
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const Account = users[0].phone;
    const { Balance } = req.body;
    console.log(Balance);

    if (Balance > 0) {
      await withdrawjili(Account, Balance)
        .then(async (response) => {
          console.log(response);

          // Update the walletAmount in MySQL
          await connection.query(
            "UPDATE users SET money = money + ? WHERE token = ?",
            [Balance, auth]
          );

          res.json({ success: '1', message: 'Withdrawal successful', balance: users[0].money + Balance });
        })
        .catch((error) => {
          console.error(error);
          res.status(500).json({ success: '0', message: 'Withdrawal failed' });
        });
    } else {
      res.status(400).json({ success: '0', message: 'Invalid balance amount' });
    }
  } catch (error) {
    console.error("Error occurred:", error.message);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.post("/jilireal-create-member", async (req, res) => {
    try {
      // Extract Account from the request body
      const { Account } = req.body;
  
      // Step 1: Prepare the timestamp for KeyG
      const now = new Date();
      const formattedDate = getFormattedDateInUTC4();
  
      // Step 2: Generate KeyG using the formatted date, AgentId, and AgentKey
      const keyG = md5(`${formattedDate}${AGENT_ID}${AGENT_KEY}`);
  
      // Step 3: Prepare the string of parameters that need to be hashed
      const queryString = `Account=${Account}&AgentId=${AGENT_ID}`;
      const md5string = md5(`${queryString}${keyG}`);
  
      // Step 4: Create the Key with 6 random characters at the start and end
      const randomPrefix = "123456"; // You can replace this with any random 6-character string
      const randomSuffix = "abcdef"; // You can replace this with any random 6-character string
      const key = `${randomPrefix}${md5string}${randomSuffix}`;
  
      // Step 5: Prepare the request body including the generated Key
      const requestBody = {
        Account,
        AgentId: AGENT_ID,
        Key: key, // Add the generated Key
      };
  
      // Step 6: Send the POST request to the CreateMember API
      const response = await axios.post(`${API_URL}/CreateMember`, null, {
        params: requestBody,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
  
      // Send the response back to the client
      res.json({
        message: "Member creation successful",
        requestUrl: `${API_URL}/CreateMember`,
        requestData: requestBody,
        responseData: response.data,
      });
    } catch (error) {
      console.error("Error occurred:", error.message);
      res.status(500).json({ error: "An error occurred" });
    }
  });
  

  app.post("/jilireal-exchange-transfer", async (req, res) => {
    try {
      const { Account, TransactionId, Amount, TransferType } = req.body;
  
      // Step 1: Prepare the timestamp for KeyG
      const now = new Date();
      const formattedDate = getFormattedDateInUTC4();
  
      // Step 2: Generate KeyG using the formatted date, AgentId, and AgentKey
      const keyG = md5(`${formattedDate}${AGENT_ID}${AGENT_KEY}`);
  
      // Step 3: Prepare the string of parameters that need to be hashed
      const queryString = `Account=${Account}&TransactionId=${TransactionId}&Amount=${Amount}&TransferType=${TransferType}&AgentId=${AGENT_ID}`;
      const md5string = md5(`${queryString}${keyG}`);
  
      // Step 4: Create the Key with 6 random characters at the start and end
      const randomPrefix = "123456"; // You can replace this with any random 6-character string
      const randomSuffix = "abcdef"; // You can replace this with any random 6-character string
      const key = `${randomPrefix}${md5string}${randomSuffix}`;
  
      // Step 5: Prepare the request body including the generated Key
      const requestBody = {
        Account,
        TransactionId,
        Amount,
        TransferType,
        AgentId: AGENT_ID,
        Key: key, // Add the generated Key
      };
  
      // Step 6: Send the POST request to the ExchangeTransferByAgentId API
      const response = await axios.post(`${API_URL}/ExchangeTransferByAgentId`, null, {
        params: requestBody,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
  
      // Send the response back to the client
      res.json({
        message: "Transfer successful",
        requestUrl: `${API_URL}/ExchangeTransferByAgentId`,
        requestData: requestBody,
        responseData: response.data,
      });
    } catch (error) {
      console.error("Error occurred:", error.message);
      res.status(500).json({ error: "An error occurred" });
    }
  });


  app.post("/jilireal-get-member-status", async (req, res) => {
    let auth = req.cookies.auth;
    const [users] = await connection.query(
      "SELECT `name_user`, `money`, `phone` FROM users WHERE token = ?",
      [auth]
    );

    // Handle case where no user is found
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const Accounts = users[0].phone;
    try {
    
      // Step 1: Prepare the timestamp for KeyG
      const now = new Date();
      const formattedDate = getFormattedDateInUTC4();
  
      // Step 2: Generate KeyG using the formatted date, AgentId, and AgentKey
      const keyG = md5(`${formattedDate}${AGENT_ID}${AGENT_KEY}`);
  
      // Step 3: Prepare the string of parameters that need to be hashed
      const queryString = `Accounts=${Accounts}&AgentId=${AGENT_ID}`;
      const md5string = md5(`${queryString}${keyG}`);
  
      // Step 4: Create the Key with 6 random characters at the start and end
      const randomPrefix = "123456"; // You can replace this with any random 6-character string
      const randomSuffix = "abcdef"; // You can replace this with any random 6-character string
      const key = `${randomPrefix}${md5string}${randomSuffix}`;
  
      // Step 5: Prepare the request body including the generated Key
      const requestBody = {
        Accounts,
        AgentId: AGENT_ID,
        Key: key, // Add the generated Key
      };
  
      // Step 6: Send the POST request to the GetMemberInfo API
      const response = await axios.post(`${API_URL}/GetMemberInfo`, null, {
        params: requestBody,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
  
      // Send the response back to the client
      res.json({
        message: "Member status retrieved successfully",
        requestUrl: `${API_URL}/GetMemberInfo`,
        requestData: requestBody,
        responseData: response.data,
      });
    } catch (error) {
      console.error("Error occurred:", error.message);
      res.status(500).json({ error: "An error occurred" });
    }
  });


// Export the router
export default app;