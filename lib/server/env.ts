function getEnv(name: string) {
  return process.env[name];
}

export const env = {
  nodeEnv: getEnv("NODE_ENV") ?? "development",
  appUrl: getEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  stripeSecretKey: getEnv("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: getEnv("STRIPE_WEBHOOK_SECRET"),
  stripePriceId: getEnv("STRIPE_CREDITS_PRICE_ID"),
  supabaseUrl: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  posthogKey: getEnv("NEXT_PUBLIC_POSTHOG_KEY"),
  posthogHost: getEnv("NEXT_PUBLIC_POSTHOG_HOST") ?? "https://us.i.posthog.com",
  klingApiKey: getEnv("KLING_API_KEY"),
  klingApiBaseUrl: getEnv("KLING_API_BASE_URL") ?? "https://api.klingai.com",
  klingWebhookSecret: getEnv("KLING_WEBHOOK_SECRET"),
};

export function hasStripe() {
  return Boolean(env.stripeSecretKey);
}

export function hasSupabase() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey);
}

export function hasPosthog() {
  return Boolean(env.posthogKey);
}

export function hasKling() {
  return Boolean(env.klingApiKey);
}
