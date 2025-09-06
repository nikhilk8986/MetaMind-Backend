const mongoose=require("mongoose");
const Schema=mongoose.Schema;

const user=new Schema({
    email:{type:String,unique:true, required: true},
    password:{type:String, required: true},
    name:{type:String},
    age:{type:Number},
    occupation:{type:String},
    gender:{type:String},
    location:{latitude:String,longitude:String}
})

const usage = new Schema({
  email: { type: String, unique: true },
  appUsages: {
    date: { type: String },
    apps: [
      {
        app: { type: String },
        duration: { type: Number, default: 0 },
        sessions: [
          {
            startTime: { type: String },
            endTime: { type: String },
            _id: false   // 🚀 prevent auto _id for each session
          }
        ],
        _id: false       // optional: also prevent _id for each app
      }
    ]
  }
});




const User=mongoose.model("user",user);
const Usage=mongoose.model("usage",usage);

module.exports={
    User,Usage
}