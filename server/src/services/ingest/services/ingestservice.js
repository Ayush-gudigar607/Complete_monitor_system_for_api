import logger from "../../../shared/config/logger.js";
import AppError from "../../../shared/utils/AppError.js";
import {v4 as uuidv4} from "uuid";

export class ingestService{
    constructor({eventProducer})
    {
        if(!eventProducer)
        {
            throw new Error("EventProducer is Required");
        }

        this.eventProducer=eventProducer;
    }

    _validateHitData(hitData)
    {
        const requiredFields=[
            "serviceName",
            "endpoint",
            "method",
            "statusCode",
            "latencyMs",
            "clientId",
        ];

        const missingFields=requiredFields.filter((field)=>!hitData[field]);
        
        if(missingFields.length>0)
        {
            throw new AppError(`Missing required fields: ${missingFields.join(", ")}`,400);
        }

        const validMethods=["GET","POST","PUT","DELETE","PATCH","OPTIONS","HEAD"];

        if(!validMethods.includes(hitData.method.toUpperCase()))
        {
            throw new AppError(`Invalid HTTP method: ${hitData.method}`,400);
        }

        const statusCode=parseInt(hitData.statusCode,10);
        if(isNaN(statusCode)||statusCode<100||statusCode>599)
        {
            throw new AppError(`Invalid HTTP status code: ${hitData.statusCode}`,400);
        }

        const latencyMs=parseFloat(hitData.latencyMs);
        if(isNaN(latencyMs)||latencyMs<0)
        {
            throw new AppError(`Invalid latencyMs value: ${hitData.latencyMs}`,400);
        }

        return true;
       
    }

    async _publishValidationError(hitData, error) {
        if (!hitData.clientId || !hitData.apiKeyId) {
            return;
        }

        const method = typeof hitData.method === "string"
            ? hitData.method.toUpperCase()
            : "GET";
        const validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];
        const latencyMs = Number.parseFloat(hitData.latencyMs);

        const event = {
            eventId: uuidv4(),
            timestamp: new Date(),
            serviceName: hitData.serviceName || "unknown-service",
            endpoint: hitData.endpoint || "unknown-endpoint",
            method: validMethods.includes(method) ? method : "GET",
            statusCode: error.statusCode >= 400 ? error.statusCode : 400,
            latencyMs: Number.isFinite(latencyMs) && latencyMs >= 0 ? latencyMs : 0,
            clientId: hitData.clientId,
            apiKeyId: hitData.apiKeyId,
            ip: hitData.ip || "unknown",
            userAgent: hitData.userAgent || "",
        };

        try {
            await this.eventProducer.publishApiHit(event);
        } catch (publishError) {
            logger.error("Failed to publish validation error hit", {
                error: publishError.message,
                eventId: event.eventId,
            });
        }
    }

    async ingestApiHit(hitData)
    {
        try{
           // Accept both the public `status` name and the internal `statusCode` name.
           const normalizedHitData = {
            ...hitData,
            statusCode: hitData.statusCode ?? hitData.status,
           };

           this._validateHitData(normalizedHitData);

           const event={
            eventId:uuidv4(),
            timestamp:new Date,
            serviceName:normalizedHitData.serviceName,
            endpoint:normalizedHitData.endpoint,
            method:normalizedHitData.method.toUpperCase(),
            statusCode:parseInt(normalizedHitData.statusCode, 10),
            latencyMs:parseFloat(normalizedHitData.latencyMs),
            clientId:normalizedHitData.clientId,
            apiKeyId:normalizedHitData.apiKeyId,
            ip:normalizedHitData.ip || 'unknown',
            userAgent:normalizedHitData.userAgent || ''
           };

           const published=await this.eventProducer.publishApiHit(event);

           if(!published)
           {
            logger.error("Failed to publish API hit event",{
                eventId:event.eventId,
                endpoint:event.endpoint,
                method:event.method,
                clientId:event.clientId,
                apiKeyId:event.apiKeyId
            });

            return {
                eventId:event.eventId,
                status:'rejected',
                reason:'service_unavailable',
                timestamp:new Date()
            }
           }

            logger.info("API hit ingested",{
                eventId: event.eventId,
                endpoint: event.endpoint,
                method: event.method,
                statusCode: event.statusCode,
                clientId: event.clientId,
            });

            return {
                eventId:event.eventId,
                status:'queued',
                timestamp:event.timestamp,
            }
        }
        catch(err)
        {
         logger.error("Error occurred while ingesting hit data", {
          error: err.message,
         });
         await this._publishValidationError(hitData, err);
                 throw err instanceof AppError
                    ? err
                    : new AppError("Invalid hit data",400);
        }
    }
}
