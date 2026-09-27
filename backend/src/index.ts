import { app } from "./app.js";
import { env } from "./config/env.js";
import { startEndOfDayScheduler, startPayoutRetryLoop } from "./modules/payouts/payouts.service.js";

app.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
  startPayoutRetryLoop();
  startEndOfDayScheduler();
});
