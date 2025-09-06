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

// Update user app usage (protected)
router.put("/update", auth, async (req, res) => {
  try {
    const email = req.email;
    const { app, session } = req.body;

    if (!email || !app || !session) {
      return res.status(400).json({
        success: false,
        message: "Email, app name, and session data are required"
      });
    }

    // Always convert to array
    const sessionsToAdd = Array.isArray(session) ? session : [session];

    // Try updating existing app
    let updatedUsage = await Usage.findOneAndUpdate(
      { email, "appUsages.apps.app": app },
      {
        $push: { "appUsages.apps.$.sessions": { $each: sessionsToAdd } }
      },
      { new: true }
    );

    // If app doesn't exist, create it
    if (!updatedUsage) {
      updatedUsage = await Usage.findOneAndUpdate(
        { email },
        {
          $push: {
            "appUsages.apps": {
              app,
              duration: "0",
              sessions: sessionsToAdd
            }
          }
        },
        { new: true, upsert: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Usage updated",
      usage: updatedUsage
    });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
});


router.post('/differentiate', auth, async (req, res) => {
  try {
    const email = req.email;

    const userUsage = await Usage.findOne(
      { email },
      { "appUsages.apps": 1, _id: 0 } // fetch only apps
    );

    if (!userUsage || !userUsage.appUsages || !userUsage.appUsages.apps) {
      console.log("No usage found for this user");
      return res.status(404).json({
        success: false,
        message: "No app usage found for this user",
        apps: []
      });
    }

    // Calculate duration from sessions
    const appsWithDuration = userUsage.appUsages.apps.map(appData => {
      let totalDurationMs = 0;

      if (appData.sessions && appData.sessions.length > 0) {
        appData.sessions.forEach(session => {
          if (session.startTime && session.endTime) {
            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            if (!isNaN(start) && !isNaN(end) && end > start) {
              totalDurationMs += end - start;
            }
          }
        });
      }

      // Convert ms → minutes
      const totalMinutes = Math.floor(totalDurationMs / 60000);

      return {
        app: appData.app,
        duration: `${totalMinutes} min`,
        sessions: appData.sessions
      };
    });

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