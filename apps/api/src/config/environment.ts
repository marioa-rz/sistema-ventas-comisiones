export interface Environment {
  databaseUrl: string;
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
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

  return { databaseUrl, nodeEnv: nodeEnv as Environment['nodeEnv'], port };
}
