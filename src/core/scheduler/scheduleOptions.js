export function resolveScheduleOptions(env, overrides = {}) {
  const options = { ...overrides };
  if (env.SKIP_CRON_APPLY === "1") {
    options.applySchedules = false;
  }
  return options;
}
