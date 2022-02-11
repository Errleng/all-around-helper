declare global {
    namespace NodeJS {
        interface ProcessEnv {
            APP_ID: string;
            APP_PUBLIC_KEY: string;
            BOT_TOKEN: string;
            CLIENT_ID: string;
            CLIENT_SECRET: string;
            DEV_USER: string;
            TEST_SERVER_ID: string;
            DATABASE_URL: string;
            REQUEST_LIMIT: number;
            USE_COLORED_TEXT: boolean;
            USE_CUSTOM_EMOJIS: boolean;
            PGUSER: string;
            PGDATABASE: string;
            PGPASSWORD: string;
            PGHOST: string;
            PGPORT: number;
            EXTRACTED_ASSETS_DIR: string;
        }
    }
}
export {};
