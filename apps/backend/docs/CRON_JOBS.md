# Cron Jobs

## Adding a New Cron Job

1. Create a new file in `src/lib/cron/jobs/your-job-name.ts`
2. Define your job following this pattern:

```typescript
import type { CronJob } from '../types';

export const yourJobName: CronJob = {
  name: 'your-job-name',
  schedule: '0 * * * *', // Cron expression
  description: 'Description of what this job does',
  enabled: true,
  execute: async () => {
    // Your job logic here
  },
};
```

3. Register the job in `src/lib/cron/cron-manager.ts` by importing and adding it to the jobs array

## Cron Expression Examples

- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour at minute 0
- `0 0 * * *` - Daily at midnight
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight

## Managing Jobs

- View job status: GET `/api/v1/cron/jobs`
- Trigger job manually: POST `/api/v1/cron/jobs/{name}/trigger`
- Enable/disable jobs by setting the `enabled` property