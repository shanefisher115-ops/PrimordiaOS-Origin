declare module "*.json" {
  const value: any;
  export default value;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
      PORT?: string;
      DATABASE_URL?: string;
      SUPABASE_URL?: string;
      SUPABASE_SERVICE_ROLE_KEY?: string;
    }
  }
}

export {};