declare global {
  namespace NodeJS {
    interface ProcessEnv {
      APP_ID: string;
      APP_PUBLIC_KEY: string;
      BOT_TOKEN: string;
      CLIENT_ID: string;
      CLIENT_SECRET: string;
      TEST_SERVER_ID: string;
    }
  }
}
export {};
