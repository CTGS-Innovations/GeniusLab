import type { IncomingMessage, ServerResponse } from 'node:http';

export function createApi(opts?: { dataDir?: string; log?: (msg: string) => void }): (
  req: IncomingMessage,
  res: ServerResponse,
  next?: () => void,
) => Promise<void>;
