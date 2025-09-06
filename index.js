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
const MONGO_URI = process.env.MONGO_URI;

app.use(express.json());


app.get('/test', (req, res)=>{
    res.json('sayan')
});
app.use('/user',userRoutes);



app.listen(3000);