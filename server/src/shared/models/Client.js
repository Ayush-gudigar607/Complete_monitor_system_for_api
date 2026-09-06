import mongoose from 'mongoose';

const clientSchema=new mongoose.Schema(
    {
    name:{
    type:String,
    required:true,
    trim:true,
    minlength:3,
    maxlength:100,
   },
   slug:{
    type:String,
    required:true,
    unique:true,
    trim:true,
    lowercase:true,
   },

   email:{
    type:String,
    required:true,
    lowercase:true,
    trim:true,
    unique:true,
   },

   description:{
    type:String,
    trim:true,
    maxlength:500,
    default:'',
   },

   website:{
    type:String,
    default:'',
    trim:true,
    validate: {
      validator: (website) => !website || /^https?:\/\/[^\s]+$/i.test(website),
      message: "Website must be a valid HTTP or HTTPS URL",
    },
   },
   createdBy:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User',
    required:true,
   },
   isActive:{
    type:Boolean,
    default:true,
    },
    settings:{
        dataRetentionPeriod:{
            type:Number,
            default:30, //default 30 days
            min:7, //minimum 7 day
            max:365, //maximum 365 days
        },
        alertsEnabled:{
            type:Boolean,
            default:true,
    },
    timeZone:{
        type:String,
        default:'UTC',
    },
},
    },{
        timestamps:true,
        collection:'clients',
    }
   

)

clientSchema.index({isActive:1});
const client=mongoose.model('Client',clientSchema);
export default client;
