export function getEnv(name: string): string {
  // 1. Literal checks (sometimes required by bundlers for static replacement)
  if (name === "SUPABASE_URL" && process.env.SUPABASE_URL) {
    return process.env.SUPABASE_URL;
  }
  if (name === "SUPABASE_SERVICE_ROLE_KEY" && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  // 2. Dynamic access
  let value = process.env[name];

  // 3. Fallback to NEXT_PUBLIC version
  if (!value) {
    value = process.env[`NEXT_PUBLIC_${name}`];
  }

  if (!value) {
    throw new Error(`Umgebungsvariable ${name} fehlt. (Geprueft: ${name} und NEXT_PUBLIC_${name})`);
  }

  return value;
}
