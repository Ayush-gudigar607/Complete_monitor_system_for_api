import mongoose from "mongoose";

const apiHitSchema = new mongoose.Schema({
  eventId:{
    type: String,
    required: true,
    unique: true,
    index: true
  }  ,
  timestamp: {
  type: Date,
    required: true
  },
  serviceName: {
    type: String,
    required: true,
    index: true
  },
  endpoint: {
    type: String,
    required: true,
    index: true
  },
  method:{
    type: String,
    required:true,
    index:true
  },
  method:{
    type: String,
    required:true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  },
  statusCode: {
    type: Number,
    required: true,
    index: true
  },
  latencyMs:{
    type: Number,
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
    index: true
  },
  apiKeyId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "ApiKey",
    required: true,
    index: true
  },
  ip:{
    type: String,
    required: true
  },
  userAgent:{
    type: String,
    required: true
  }

},
{
    timestamps: true,
    collection: "api_hits"
})

apiHitSchema.index({ clientId: 1, serviceName: 1, endpoint: 1, timestamp: -1 });
apiHitSchema.index({ clientId: 1, timestamp: -1, statusCode: 1 });
apiHitSchema.index({ apiKeyId: 1, timestamp: -1 });
apiHitSchema.index({ timestamp: 1 },{expireAfterSeconds: 60 * 60 * 24 * 30}); // TTL index for 30 days


const apiHit = mongoose.model("ApiHit", apiHitSchema);

export default apiHit;
