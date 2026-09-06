import winston from "winston";
import config from "./index.js";

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

//Provide the transports for the logger, including file and console transports. The file transport will log error messages to a file named "error.log" and all logs to a file named "combined.log". The console transport will log messages to the console in a colorized format.
const transports = [
  new winston.transports.File({ filename: "logs/error.log", level: "error" }),
  new winston.transports.File({ filename: "logs/combined.log" }), //without error level saved in combine.log
];

//console format
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple(),
);

//These will be creates during the logger creation, and will be used to log messages to the console in a colorized format.
const logger = winston.createLogger({
  level: config.node_env == "production" ? "info" : "debug",
  format,
  defaultMeta: { service: "api-monitoring-service" },
  transports,

  exceptionHandlers: [
    new winston.transports.File({ filename: "logs/exceptions.log" }),
  ],

  rejectionHandlers: [
    new winston.transports.File({ filename: "logs/rejections.log" }),
  ],
});

//This mainly for development purpose, if the environment is not production then add the console transport to the logger. This will log messages to the console in a colorized format.
if (config.node_env !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}

export default logger;
