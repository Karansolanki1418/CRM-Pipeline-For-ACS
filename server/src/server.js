import { startServer } from "./app.js";
import { startReminderJob } from "./jobs/reminderJob.js";

startServer();
startReminderJob();

