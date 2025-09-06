const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const user = new Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: { type: String },
    age: { type: Number },
    occupation: { type: String },
    gender: { type: String },
    location: { latitude: String, longitude: String }
});

const sessionSchema = new Schema({
    startTime: { type: String },
    endTime: { type: String }
}, { _id: false });

const appSchema = new Schema({
    app: { type: String },
    duration: { type: Number, default: 0 },
    sessions: [sessionSchema]
}, { _id: false });

const appUsageSchema = new Schema({
    date: { type: String },
    apps: [appSchema]
}, { _id: false });

const usage = new Schema({
    email: { type: String, unique: true },
    appUsages: [appUsageSchema]
});

const User = mongoose.model("user", user);
const Usage = mongoose.model("usage", usage);

module.exports = {
    User, Usage
}