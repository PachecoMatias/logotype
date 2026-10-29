import { limiteIp, maxRondasSesion } from '../../config/advisor-config.js';
import { AppError } from '../../errors/app-error.js';

function rateLimitError() {
  return new AppError(429, 'RATE_LIMITED', 'Advisor rate limit exceeded');
}

export function createAdvisorRateLimiter({
  now = Date.now,
  ipLimit = limiteIp,
  maxSessionCalls = maxRondasSesion,
} = {}) {
  const ipEntries = new Map();
  const sessionEntries = new Map();

  function consume(ip, sessionId) {
    const timestamp = now();
    const currentIp = ipEntries.get(ip);
    const activeIp =
      currentIp && timestamp - currentIp.startedAt < ipLimit.ventanaMs
        ? currentIp
        : { startedAt: timestamp, calls: 0 };

    if (activeIp.calls >= ipLimit.max) throw rateLimitError();

    const sessionCalls = sessionEntries.get(sessionId) ?? 0;
    if (sessionCalls >= maxSessionCalls) throw rateLimitError();

    activeIp.calls += 1;
    ipEntries.set(ip, activeIp);
    sessionEntries.set(sessionId, sessionCalls + 1);

    return { sessionCalls: sessionCalls + 1 };
  }

  function reset() {
    ipEntries.clear();
    sessionEntries.clear();
  }

  return { consume, reset };
}

export const advisorRateLimiter = createAdvisorRateLimiter();
