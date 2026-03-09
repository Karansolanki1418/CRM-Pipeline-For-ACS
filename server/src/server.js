import { startServer } from "./app.js";
import { startReminderJob } from "./jobs/reminderJob.js";

startServer()
    .then(() => startReminderJob())
    .catch((err) => {
        console.error("Failed to start server:", err);
        process.exit(1);
    });


