export interface Environment {
  databaseUrl: string;
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  trustProxyHops: number;
  supabaseJwtIssuer: string;
  supabaseJwtAudience: string;
  supabaseJwksUrl: string;
}

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const databaseUrl = source.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const nodeEnv = source.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const port = Number(source.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const trustProxyValue = source.TRUST_PROXY_HOPS?.trim();
  if (nodeEnv === 'production' && !trustProxyValue) {
    throw new Error('TRUST_PROXY_HOPS must be configured in production');
  }
  const trustProxyHops = Number(trustProxyValue ?? 0);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 10) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 10');
  }

  const supabaseJwtIssuer = required(source, 'SUPABASE_JWT_ISSUER').replace(/\/$/, '');
  const supabaseJwtAudience = required(source, 'SUPABASE_JWT_AUDIENCE');
  const supabaseJwksUrl = required(source, 'SUPABASE_JWKS_URL');
  const expectedJwksUrl = `${supabaseJwtIssuer}/.well-known/jwks.json`;

  if (supabaseJwksUrl !== expectedJwksUrl) {
    throw new Error('SUPABASE_JWKS_URL must be the discovery endpoint for SUPABASE_JWT_ISSUER');
  }

  const issuerUrl = new URL(supabaseJwtIssuer);
  if (nodeEnv === 'production' && issuerUrl.protocol !== 'https:') {
    throw new Error('SUPABASE_JWT_ISSUER must use HTTPS in production');
  }

  return {
    databaseUrl,
    nodeEnv: nodeEnv as Environment['nodeEnv'],
    port,
    trustProxyHops,
    supabaseJwtIssuer,
    supabaseJwtAudience,
    supabaseJwksUrl,
  };
}

function required(source: NodeJS.ProcessEnv, name: string): string {
  const value = source[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}
