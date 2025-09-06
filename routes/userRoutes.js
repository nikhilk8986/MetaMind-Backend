const express = require("express");
const router=express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDnAPANjlhkdFQ18TtcSSyhVp-9cFm9ndo";
const genAI = new GoogleGenerativeAI(API_KEY);
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

router.get("/gemini-hi", auth, async (req, res) => {
  try {
    const email = req.email;
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

    // Build prompt for Gemini to return only challenges
    const usageSummary = appDurations.map(app => `${app.app}: ${app.duration} seconds`).join(", ");
    const prompt = `Based on my app usage for today: ${usageSummary}, suggest exactly 3 personalized challenges to help me reduce my screen time and improve productivity.

Please respond with ONLY the 3 challenges in this exact format:
1. [First challenge]
2. [Second challenge] 
3. [Third challenge]

Each challenge should be:
- Specific and actionable
- Realistic and achievable
- Focused on reducing screen time or improving productivity
- No explanations or additional text

Example format:
1. Use YouTube for only 15 minutes today
2. Take a 10-minute break every hour
3. Close all social apps after 9 PM`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Parse the response to extract challenges
    const challengesText = response.text();
    const challenges = challengesText
      .split('\n')
      .filter(line => line.trim().match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(challenge => challenge.length > 0);

    res.status(200).json({
      message: "Success",
      challenges: challenges
    });
  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(500).json({ message: "Gemini API error" });
  }
});

router.get("/gemini-productivity", auth, async (req, res) => {
  try {
    const email = req.email;
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

    // Build prompt for Gemini to categorize apps as productive or non-productive
    const appList = appDurations.map(app => app.app).join(", ");
    const prompt = `Analyze these apps and categorize each one as either "productive" or "non-productive" based on their typical usage patterns. 

Apps: ${appList}

Please respond with a JSON object where each app name is a key and the value is either "productive" or "non-productive". 

Example format:
{
  "Chrome": "productive",
  "YouTube": "non-productive",
  "VS Code": "productive",
  "Instagram": "non-productive"
}

Consider productive apps as those typically used for work, learning, productivity, communication for work purposes, or personal development. Consider non-productive apps as those typically used for entertainment, social media, gaming, or time-wasting activities.`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    let productivityData;
    try {
      // Try to parse the JSON response
      productivityData = JSON.parse(response.text());
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", parseError);
      // Fallback: create a simple categorization based on common patterns
      productivityData = {};
      appDurations.forEach(app => {
        const appName = app.app.toLowerCase();
        if (appName.includes('code') || appName.includes('studio') || appName.includes('slack') || 
            appName.includes('chrome') || appName.includes('browser') || appName.includes('mail') ||
            appName.includes('office') || appName.includes('word') || appName.includes('excel') ||
            appName.includes('powerpoint') || appName.includes('notion') || appName.includes('trello')) {
          productivityData[app.app] = "productive";
        } else if (appName.includes('youtube') || appName.includes('instagram') || appName.includes('facebook') ||
                   appName.includes('twitter') || appName.includes('tiktok') || appName.includes('netflix') ||
                   appName.includes('spotify') || appName.includes('game') || appName.includes('whatsapp')) {
          productivityData[app.app] = "non-productive";
        } else {
          // Default to non-productive for unknown apps
          productivityData[app.app] = "non-productive";
        }
      });
    }

    res.status(200).json({
      message: "Success",
      usage: appDurations,
      productivity: productivityData
    });
  } catch (err) {
    console.error("Gemini productivity API error:", err);
    res.status(500).json({ message: "Gemini productivity API error" });
  }
});

router.get("/gemini-weekly-focus", auth, async (req, res) => {
  try {
    const email = req.email;
    const usage = await Usage.findOne({ email });
    if (!usage) {
      return res.status(404).json({
        message: "No usage data found"
      });
    }
    
    const appUsages = usage.appUsages;
    const result = [];
    const currentDate = new Date();

    // Get 7 days of data (same as getdurations endpoint)
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

    const weeklyData = result.reverse(); // oldest to newest

    // Build prompt for Gemini to analyze focus vs screen time for each day
    const prompt = `Analyze the following weekly app usage data and calculate focus score (0-100) for each day based on the apps used and their durations.

Weekly Data:
${JSON.stringify(weeklyData, null, 2)}

For each day, calculate:
1. Total screen time in hours
2. Focus score (0-100) based on productive vs non-productive app usage
3. Number of unique apps used

Consider these apps as productive: VS Code, IntelliJ, Xcode, Android Studio, Slack, Microsoft Teams, Chrome (for work), Office apps, Notion, Trello, Mail apps, Browser (for work), Digital Library, etc.

Consider these apps as non-productive: Instagram, YouTube, Facebook, Twitter, TikTok, Netflix, Spotify, Games, WhatsApp (for personal), etc.

Please respond with a JSON array where each object has:
- date: the date string
- screenTime: total hours (rounded to 1 decimal)
- focus: focus score (0-100)
- apps: number of unique apps

Example format:
[
  {
    "date": "2025-08-31",
    "screenTime": 1.3,
    "focus": 85,
    "apps": 1
  },
  {
    "date": "2025-09-01", 
    "screenTime": 1.3,
    "focus": 85,
    "apps": 1
  }
]`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result_gemini = await model.generateContent(prompt);
    const response = await result_gemini.response;
    
    let focusAnalysis;
    try {
      // Try to parse the JSON response
      focusAnalysis = JSON.parse(response.text());
    } catch (parseError) {
      console.error("Failed to parse Gemini focus response as JSON:", parseError);
      // Fallback: create basic analysis based on app patterns
      focusAnalysis = weeklyData.map(dayData => {
        const totalDuration = Object.values(dayData.durations).reduce((sum, duration) => sum + duration, 0);
        const screenTimeHours = Math.round((totalDuration / 3600) * 10) / 10;
        
        // Calculate focus based on productive apps
        const productiveApps = ['VS Code', 'IntelliJ', 'Xcode', 'Android Studio', 'Slack', 'Microsoft Teams', 'Chrome', 'Office', 'Notion', 'Trello', 'Mail', 'Browser', 'Digital Library'];
        const productiveDuration = Object.entries(dayData.durations)
          .filter(([app]) => productiveApps.some(prodApp => app.toLowerCase().includes(prodApp.toLowerCase())))
          .reduce((sum, [, duration]) => sum + duration, 0);
        
        const focusScore = totalDuration > 0 ? Math.round((productiveDuration / totalDuration) * 100) : 0;
        const appCount = Object.keys(dayData.durations).length;
        
        return {
          date: dayData.date,
          screenTime: screenTimeHours,
          focus: focusScore,
          apps: appCount
        };
      });
    }

    res.status(200).json({
      message: "Success",
      durations: weeklyData,
      focusAnalysis: focusAnalysis
    });
  } catch (err) {
    console.error("Gemini weekly focus API error:", err);
    res.status(500).json({ message: "Gemini weekly focus API error" });
  }
});

module.exports=router;