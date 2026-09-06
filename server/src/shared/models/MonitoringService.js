import mongoose from "mongoose";

const monitoringServiceSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApiKey",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    baseUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value) => /^https?:\/\/[^\s]+$/i.test(value),
        message: "Base URL must be a valid HTTP or HTTPS URL",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, collection: "monitoring_services" },
);

monitoringServiceSchema.index({ clientId: 1, name: 1 }, { unique: true });

export default mongoose.model("MonitoringService", monitoringServiceSchema);
