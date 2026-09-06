import logger from "../../../shared/config/logger.js";
import ResponseFormatter from "../../../shared/utils/ResponceFormatter.js";

export class IngestController {
    constructor({ingestService})
    {
     if(!ingestService)
     {
        throw new Error("ingestService is required");
     }
     this.ingestService=ingestService;
    }

    async ingestHit(req,res,next)
    {
        try {
            logger.info("Ingest:Client data received",{
                clientId:req.client._id,
                clientName:req.client.name,
                clientKeys:Object.keys(req.client),
            });

            const hitData={
                ...req.body,
                clientId:req.client._id,
                apiKeyId:req.apiKey._id,
                ip:req.ip || req.connection.remoteAddress || 'unknown',
                userAgent:req.get('User-Agent') || '',
            };
        
            const result=await this.ingestService.ingestApiHit(hitData);

            if(result.status==='rejected')
            {
                  return res.status(503).json(ResponseFormatter.error('Service temporarily unavailable',503,{
                    eventId:result.eventId,
                    reason:result.reason,
                    retryAfter:'30 seconds'
                }))
            }

            return res.status(202).json(
                ResponseFormatter.success(
                    { eventId: result.eventId },
                    "Event accepted for processing",
                    202,
                ),
            );

        } catch (error) {
            next(error);
        }
    }
}
