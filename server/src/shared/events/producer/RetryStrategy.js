export const RETRYABLE_PATTERNS = [
  "channel_closed",
  "connection_closed",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETHIMEDOUT",
  "buffer_full",
  "heartbeat_timeout",
  "not_available",
  "server connection closed"
];

export function isRetryable(err)
{
    if(!err || !err.message)
    {
        return false;
    };

    const message=(err.message || "").toLowerCase();
    const code=(err.code || "").toString().toLowerCase();

   //Some specific error patterns that are commonly associated with transient issues in RabbitMQ or network problem
    if(code === "enotfound") return true;

    return RETRYABLE_PATTERNS.some((pattern) => {
        const normalizedPattern = pattern.toLowerCase();
        return message.includes(normalizedPattern) || code.includes(normalizedPattern);
    });
};

export class RetryStrategy {
   constructor(opts={})
   {
    this.maxRetries=opts.maxRetries || 5;
    this.baseDelay=opts.baseDelay || 200; // in milliseconds
    this.maxDelay=opts.maxDelay || 5000; // in milliseconds
    //jitter factor is used to introduce randomness in the retry delay to avoid thundering herd problem
    this.jitterFactor=opts.jitterFactor || 0.3; // 30% jitter
   }

   shouldRetry(attempt)
   {
    return attempt < this.maxRetries;
   };

   delay(attempt)
   {
    const exponential=this.baseDelay * Math.pow(2,attempt);
    const capped=Math.min(exponential,this.maxDelay);
    const jitterRange=capped * this.jitterFactor;
    const jitter=(Math.random()-0.5) * 2 * jitterRange; // Random value between -jitterRange and +jitterRange
    return Math.max(0,Math.round(capped+jitter));
   };

   wait(attempt)
   {
    const ms=this.delay(attempt);
    // Return a promise that resolves after the calculated delay
    return new Promise(resolve=>setTimeout(resolve,ms));
   };
};
