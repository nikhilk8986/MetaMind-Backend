const mongoose=require("mongoose");
const Schema=mongoose.Schema;

const user=newSchema({
    email:{type:String,unique:true},
    password:{String},
    name:{String},
    age:{Number},
    occupation:{String},
    gender:{String},
    location:{latitude:String,longitude:String}
})

const usage=newSchema({
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