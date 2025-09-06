const express = require("express");
const router=express.Router();

const jwt=require("jsonwebtoken")
const bcrypt=require("bcrypt")
const JWT_SECRET = process.env.JWT_SECRET || "sayan_manna";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;
const { User,Usage}=require("../db/db");
router.use(express.json());

function auth(req,res,next){
    const token=req.headers.token;
    const decodeData=jwt.verify(token,JWT_SECRET);

    if(decodeData.email){
        req.email=decodeData.email;
        next();
    }
    else {
        res.status(500).json({
            message:"you are not logged in"
        })
    }
}

router.post('/signup',async(req,res)=>{
    const email=req.body.email;
    const password=req.body.password;
    const name = req.body.name;
    const confirmPassword=req.body.confirmPassword;
    const latitude = req.headers.latitude;
    const longitude = req.headers.longitude;
    if(password!=confirmPassword){
        return res.status(500).json({
            message:"Incorrect Password Match"
        });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await User.create({
            email,
            name,
            password: hashedPassword,
            location: {latitude, longitude}
        });
        res.status(200).json({
            message:"YOU ARE SIGNED UP"
        });
    }
    catch (err) {
        console.log("failed to create ID 2", err);
        res.status(500).json({message: "Failed to create ID."});
    }
});

router.post('/signin', async(req, res)=>{
    const {email, password} = req.body;
    const user = await User.findOne({email});
    if(!user){
        return res.status(400).json({message: "User not found"});
    }
    if(!user.password){
        return res.status(400).json({message: "User password not set"});
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if(isMatch){
        const token = jwt.sign({email: user.email}, JWT_SECRET);
        return res.status(200).json({message: "Login successful", token});
    }
    res.status(400).json({message: "Invalid credentials"});
});


module.exports=router;