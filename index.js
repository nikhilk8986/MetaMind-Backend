const express=require("express");
const app=express();
const jwt=require("jsonwebtoken")
const mongoose = require("mongoose")
// require('dotenv').config();
const cors = require("cors");
const userRoutes=require('./routes/userRoutes');
// Environment variables with fallbacks
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL;
const MONGO_URI = "mongodb+srv://sayan2003dev:admin@cluster0.fuvcpma.mongodb.net/metamind";

app.use(express.json());


app.get('/test', (req, res)=>{
    res.json('sayan')
});
app.use('/user',userRoutes);

mongoose.connect(MONGO_URI).then(()=>{
    console.log('MongoDB connected successfully');
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
        console.log(`Frontend URL: ${FRONTEND_URL}`);
    });
}).catch((err) => {
    console.log("Failed to connect to MongoDB:", err.message);
});

app.listen(3000);