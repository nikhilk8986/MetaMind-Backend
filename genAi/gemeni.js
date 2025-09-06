import * as dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY not found in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function testGemini() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Say hello in a cool way.");
    const response = await result.response;
    console.log("✅ Gemini says:\n", response.text());
  } catch (error) {
    console.error("❌ Error calling Gemini API:", error);
  }
}

testGemini();