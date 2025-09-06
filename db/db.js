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

const usage=new Schema({
    email:{type:String,unique:true},
    appUsages:{
        date:{String},
        apps:[{
            app:{String},
            duration:{String},
            startTime:{String},
            endTime:{String}
        }]
    }

})

const User=mongoose.model("user",user);
const Usage=mongoose.model("usage",usage);

module.exports={
    User,Usage
}