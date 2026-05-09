declare namespace Cloudflare {
  interface Env {
    "lol-stats-kv": KVNamespace;
    GITHUB_OWNER: string;
    GITHUB_REPOSITORY: string;
    GITHUB_API_TOKEN?: string;
    FANDOM_BOT_USERNAME: string;
    FANDOM_BOT_PASSWORD?: string;
    CLOUDFLARE_API_TOKEN?: string;
    CLOUDFLARE_ACCOUNT_ID?: string;
    ADMIN_SECRET?: string;
    GITHUB_TIME?: string;
    GITHUB_SHA?: string;
  }
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

interface ScheduledEvent {
  readonly cron: string;
  readonly scheduledTime: number;
  readonly noRetry: boolean;
}
