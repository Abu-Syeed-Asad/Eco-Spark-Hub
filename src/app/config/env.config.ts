import env from "dotenv";
env.config();

interface IEnvEliment {
  NODE_ENV: string;
  PORT: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  DATABASE_URL: string;
}

const envConfig = (): IEnvEliment => {
  const envAllEliment = [
    "NODE_ENV",
    "PORT",
    "BETTER_AUTH_URL",
    "BETTER_AUTH_SECRET",
    "DATABASE_URL",
    
  ];
  envAllEliment.forEach((eliment) => {
    if (!process.env[eliment]) {
      throw new Error(`thsi error occure from config/env.config.ts  => for ${eliment} `);
    }
  })
  return {
    NODE_ENV:process.env.NODE_ENV as string,
    PORT: process.env.PORT as string,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL as string,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET as string,
    DATABASE_URL: process.env.DATABASE_URL as string
  };
  
}

export const envVars = envConfig();