import { config } from "dotenv";
config();
export const envConfig = {
  PORT: process.env.PORT || 3000,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_BASE_URL: process.env.AUTH0_BASE_URL,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
};
