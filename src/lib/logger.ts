type LogMeta = Record<string, unknown>;

async function captureSentryError(error: unknown, meta: LogMeta = {}) {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      extra: meta,
    });
  } catch {
    // Logging must never throw or affect request handling.
  }
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    };
  }
  return { message: String(error) };
}

function log(level: 'info' | 'warn' | 'error', message: string, meta: LogMeta = {}) {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    service: 'gb-speaking-ai',
    ...meta,
  };

  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (message: string, meta?: LogMeta) => log('info', message, meta),
  warn: (message: string, meta?: LogMeta) => log('warn', message, meta),
  error: (message: string, error?: unknown, meta?: LogMeta) => {
    log('error', message, {
      ...meta,
      error: error === undefined ? undefined : serializeError(error),
    });
    if (error !== undefined) void captureSentryError(error, { message, ...meta });
  },
};
