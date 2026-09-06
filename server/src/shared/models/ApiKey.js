import mongoose from 'mongoose';
import config from "../config/index.js";


const apiKeySchema=new mongoose.Schema(
    {
        keyId:{
            type:String,
            required:true,
            unique:true,
            index:true,
        },
        keyValue:{
            type:String,
            required:true,
            unique:true,
            index:true,
        },
        clientId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Client',
            required:true,
            index:true,
        },
        name:{
            type:String,
            required:true,
            trim:true,
            maxlength:100,
        },

        description:{
            type:String,
            trim:true,
            maxlength:500,
            default:'',
        },
        environment:{
            type:String,
            enum:['development','staging','production'],
            default:'production',
        },
        isActive:{
            type:Boolean,
            default:true,
        },
        permissions:{
            canIngest:{
                type:Boolean,
                default:true,
            },
            canAnalytics:{
                type:Boolean,
                default:false,
            },
            allowedServices:[
                {
                type:String,
                trim:true,
            }
            ],

            security: {
      allowedIPs: [
        {
          type: String,
          validate: {
            validator: function (v) {
              return (
                /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(v) ||
                v === "0.0.0.0/0"
              );
            },
            message: "Invalid IP address format",
          },
        },
      ],
      allowedOrigins: [
        {
          type: String,
          validate: {
            validator: function (v) {
              return /^https?:\/\/[^\s]+$/.test(v) || v === "*";
            },
            message: "Invalid origin format",
          },
        },
      ],
      lastRotated: {
        type: Date,
        default: Date.now,
      },
      rotationWarningDays: {
        type: Number,
        default: 30,
      },
    },

    expiresAt: {
        type:Date,
        default:()=>
        {
            const days = parseInt(config.API_KEY_EXPIRATION_DAYS, 10) || 90;
            return new Date(Date.now() + days * 24 * 60 * 60 * 1000);  // Set expiration date to 90 days from now by default(for example 90 days from now the key will expire)
        }
        },
    },

    metadata:{
        createdBy:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            // required:true,
        },
        purpose:{
            type:String,
            trim:true,
            maxlength:200,
        },

        tags:[
          {
            type:String,
            trim:true,
            maxlength:50,
          }
        ]
    },

    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
    }

},{
    timestamps:true,
    collection:'api_Keys',
}
);

apiKeySchema.index({ clientId: 1, isActive: 1 });
apiKeySchema.index({ keyValue: 1, isActive: 1 });
apiKeySchema.index({ environment: 1, clientId: 1 });
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

apiKeySchema.methods.isExpired = function () {
     if(!this.expiresAt) return false;
     return new Date(this.expiresAt) < new Date();
}

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

export default ApiKey;
