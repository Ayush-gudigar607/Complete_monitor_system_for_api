import express from "express";
import rateLimit  from 'express-rate-limit'
import config from "../../../shared/config/index.js";
import validateApiKey from "../../../shared/middlewares/validateApiKey.js";
import ingestDependencies from "../Dependencies/dependencies.js";

const router = express.Router();
const { ingestController } = ingestDependencies;


const ingestLimitter=rateLimit({
  windowMs:config.rateLimit.windowMs,
  max:config.rateLimit.max,
 message:{
        success:false,
        message:"Too many requests,please try again later",
        statusCode:429
    },
      standardHeaders:true,
  legacyHeaders:false
});

router.post("/", validateApiKey, ingestLimitter, (req, res, next) => {
     ingestController.ingestHit(req, res, next);
});

export default router;
