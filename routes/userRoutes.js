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


//  Update user profile (protected)
router.put("/update", auth, async (req, res) => {
  try {
    const email = req.email;
    const {appUsages } = req.body;

    if (!email || !appUsages) {
      return res.status(400).json({ message: "Email and appUsages required" });
    }

    const updatedUsage = await Usage.findOneAndUpdate(
      { email },
      { $set: { appUsages } },
      { new: true, upsert: true } // create if not exists
    );

    res.json({ message: "Usage updated", usage: updatedUsage });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post('/differentiate', auth, async (req, res) => {
  try {
    const email = req.email;

    const userUsage = await Usage.findOne(
      { email },
      { "appUsages.apps": 1, _id: 0 } // only fetch apps array
    );

    if (!userUsage || !userUsage.appUsages || !userUsage.appUsages.apps) {
      console.log("No usage found for this user");
      return res.status(404).json({
        success: false,
        message: "No app usage found for this user",
        apps: []  // return empty array
      });
    }

    const appsWithDuration = userUsage.appUsages.apps.map(a => ({
      app: a.app,
      duration: a.duration
    }));

    return res.status(200).json({
      success: true,
      apps: appsWithDuration
    });

  } catch (err) {
    console.error("Error in /differentiate:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message
    });
  }
});

module.exports=router;