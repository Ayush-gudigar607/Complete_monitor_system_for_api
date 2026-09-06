import 'dotenv/config';

const config = {
    node_env: process.env.NODE_ENV || 'development',

    // Server
    port: Number(process.env.PORT || process.env.API_PORT || 5000),

    // MongoDB
    mongo: {
        host: process.env.MONGO_HOST || 'localhost',
        port: Number(process.env.MONGO_PORT || 27017),
        dbName: process.env.MONGO_DB_NAME || 'api-monitor',
        username: process.env.MONGO_ROOT_USERNAME,
        password: process.env.MONGO_ROOT_PASSWORD,
        authSource: process.env.MONGO_AUTH_SOURCE || 'admin',

        uri: process.env.MONGO_URI || (() => {
            const host = process.env.MONGO_HOST || 'localhost';
            const port = Number(process.env.MONGO_PORT || 27017);
            const dbName = process.env.MONGO_DB_NAME || 'api-monitor';
            const username = process.env.MONGO_ROOT_USERNAME;
            const password = process.env.MONGO_ROOT_PASSWORD;
            const authSource = process.env.MONGO_AUTH_SOURCE || 'admin';

            if (username && password) {
                return `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}?authSource=${authSource}`;
            }

            return `mongodb://${host}:${port}/${dbName}`;
        })(),
    },

    // PostgreSQL
    postgres: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: Number(process.env.POSTGRES_PORT || 5432),
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'ayush',
        database: process.env.POSTGRES_DB || 'api_monitoring',
    },

    // RabbitMQ
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
        queue: process.env.RABBITMQ_QUEUE || 'api_monitoring_queue',
        publisherConfirms: process.env.RABBITMQ_PUBLISHER_CONFIRMS === 'true',
        retryAttempts: Number(process.env.RABBITMQ_RETRY_ATTEMPTS || 3),
        retryDelay: Number(process.env.RABBITMQ_RETRY_DELAY || 1000),
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'your_jwt_secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    },

    // Rate Limiting
    rateLimit: {
        windowMs: Number(
            process.env.RATELIMIT_WINDOW || 15 * 60 * 1000
        ),
        max: Number(process.env.RATELIMIT_MAX || 100),
    },

    // Cookies
    cookie: {
        httpOnly: process.env.COOKIE_HTTP_ONLY !== 'false',
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: Number(
            process.env.COOKIE_EXPIRES || 24 * 60 * 60 * 1000
        ),
    },
};

export default config;