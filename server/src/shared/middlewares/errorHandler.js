import logger from "../config/logger.js";
import ResponceFormatter from "../utils/ResponceFormatter.js";

//This is the function to handle error
const errorHandler=(err,req,res,next)=>
{
    let statusCode=err.statusCode || 500;
    let message=err.message || "Internal server error"
    let errors=err.errors || null;

    //Invalid json
    if(err instanceof SyntaxError && err.statusCode===400 && "body" in err)
    {
        statusCode=400;
        message="Invalid JSON payload";
    }

    //Mongoose validation error
    else if(err.name==="ValidationError")
        {
            statusCode=400,
            message="Validation Error",
            errors=Object.values(err.errors).map((e)=>e.message)
    }
    //duplicate key(MongoDB)
    else if(err.name==="MongoServerError" && err.code===11000)
    {
        statusCode=409;
        const field = Object.keys(err.keyValue || {})[0] || "field";
        message = `${field} already exists`;
        errors = [message];
    }
    //ERROR WILL BE JsonWebTokenError
    else if(err.name ==="JsonWebTokenError")
    {
        statusCode=401;
        message="Invalid token";
    }
    //ERROR WILL BE TOKENEXPIREDERROR
    else if(err.name ==="TokenExpiredError")
    {
        statusCode=401;
        message="Token Expired";
    }

    //log the API ERROR
    logger.error("API ERROR",
        {
            message:err.message,
            statusCode,
            stack:err.stack,
            path:req.originalUrl,
            method:req.method,
            ip:req.ip,
        }
    );

    res.status(statusCode).json(ResponceFormatter.error(message,statusCode,errors))

}

export default errorHandler;