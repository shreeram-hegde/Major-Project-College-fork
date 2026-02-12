const dotenv = require("dotenv");
dotenv.config(); // Load environment variables

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const express = require("express");
const path = require('path');
const app = express();
const port = 5001;
//imports
const connectDB = require("./config/db.js");
const authRoutes = require("./routes/authRoute.js");
const mlRoutes = require('./routes/MLRoute');
const rescueRoutes = require('./routes/rescue');
const uploadRoute = require('./routes/uploadRoute'); 
const floodRoute = require('./routes/floodRoute');

//connect to db:
connectDB();

//middleware:
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

//create user:
app.use("/api/auth", authRoutes);
//ML route:
app.use('/api/flood', mlRoutes);
app.use('/api/rescue', rescueRoutes);
app.use('/api/upload', uploadRoute); 
// Static serving of ML data images
const mlDataDir = path.join(__dirname, '..', 'ML', 'ml-api', 'data');
app.use('/data', express.static(mlDataDir));

// Flood routes
app.use('/api/flood', floodRoute);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
