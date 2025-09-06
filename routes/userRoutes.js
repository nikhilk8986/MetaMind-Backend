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

router.put("/update", auth, async (req, res) => {
  try {
    const email = req.email;
    const { app, session, date } = req.body;

    if (!email || !app || !session || !date) {
      return res.status(400).json({
        success: false,
        message: "Email, app name, session data, and date are required"
      });
    }

    const sessionsToAdd = Array.isArray(session) ? session : [session];
    const newDuration = sessionsToAdd.reduce((acc, s) => {
      if (s.startTime && s.endTime) {
        const start = new Date(s.startTime);
        const end = new Date(s.endTime);
        if (!isNaN(start) && !isNaN(end)) {
          acc += Math.max(0, (end - start) / 1000);
        }
      }
      return acc;
    }, 0);

    let usageDoc = await Usage.findOne({ email });

    if (!usageDoc) {
      usageDoc = await Usage.create({
        email,
        appUsages: [{
          date,
          apps: [{
            app,
            duration: newDuration,
            sessions: sessionsToAdd
          }]
        }]
      });
    } else {
      // Find appUsage for the given date
      let appUsage = usageDoc.appUsages.find(au => au.date === date);

      if (!appUsage) {
        // Add new date entry
        usageDoc.appUsages.push({
          date,
          apps: [{
            app,
            duration: newDuration,
            sessions: sessionsToAdd
          }]
        });
      } else {
        // Find the app in apps array
        let appObj = appUsage.apps.find(a => a.app === app);

        if (appObj) {
          // Update existing app
          appObj.sessions = appObj.sessions.concat(sessionsToAdd);
          appObj.duration += newDuration;
        } else {
          // Add new app
          appUsage.apps.push({
            app,
            duration: newDuration,
            sessions: sessionsToAdd
          });
        }
      }

      await usageDoc.save();
    }

    return res.status(200).json({
      success: true,
      message: "Usage updated",
      usage: usageDoc
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





//endpoint to get daily usages

router.get("/getdurations", auth, async (req, res) => {
  const email = req.email;
  try {
    const usage = await Usage.findOne({ email });
    if (!usage) {
      return res.status(404).json({
        message: "No usage data found"
      });
    }
    const appUsages = usage.appUsages;
    const result = [];
    const currentDate = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      // Find usage for this date
      const dayUsage = appUsages.find(appUsage => appUsage.date === dateString);

      if (dayUsage) {
        // Build app durations for this day
        const dayDurations = {};
        dayUsage.apps.forEach(app => {
          dayDurations[app.app] = parseInt(app.duration);
        });
        result.push({
          date: dateString,
          durations: dayDurations
        });
      } else {
        // No usage for this day
        result.push({
          date: dateString,
          durations: {}
        });
      }
    }

    res.status(200).json({
      message: "Success",
      durations: result.reverse() // Optional: oldest to newest
    });
  } catch (err) {
    res.status(500).json({
      message: "Server Error"
    });
  }
});


router.get('/getCurrentUsage', auth, async (req, res) => {
    const email = req.email;
    try {
        const usage = await Usage.findOne({ email });
        if (!usage) {
            return res.status(404).json({
                message: "No usage data found"
            });
        }
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        const todayUsage = usage.appUsages.find(au => au.date === dateString);
        if (!todayUsage || !todayUsage.apps) {
            return res.status(404).json({
                message: "No usage data found for today"
            });
        }
        // Map to only app and duration
        const appDurations = todayUsage.apps.map(app => ({
            app: app.app,
            duration: app.duration
        }));

        res.status(200).json({
            message: "Success",
            usage: appDurations
        });
    } catch (err) {
        res.status(500).json({
            message: "Server Error"
        });
    }
});

module.exports=router;