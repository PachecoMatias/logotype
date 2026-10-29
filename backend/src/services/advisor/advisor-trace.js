import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const tracePath = fileURLToPath(new URL('../../../logs/advisor-trace.jsonl', import.meta.url));

export function appendAdvisorTrace(entry) {
  if (process.env.ADVISOR_TRACE !== '1' || process.env.NODE_ENV === 'production') return;
  mkdirSync(dirname(tracePath), { recursive: true });
  appendFileSync(tracePath, `${JSON.stringify(entry)}\n`, 'utf8');
}
