import Followup from "../models/Followup.js";
import Activity from "../models/Activity.js";
import Lead from "../models/Lead.js";



export const startReminderJob = () => {
  const run = async () => {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const dueFollowups = await Followup.find({
        status: "pending",
        dueDate: { $lte: endOfDay },
      }).populate("lead user");

      for (const f of dueFollowups) {
        await Activity.create({
          lead: f.lead._id,
          user: f.user._id,
          type: "note",
          description: `Auto reminder: follow-up due on ${f.dueDate.toLocaleDateString()}`,
          createdBy: f.user._id,
        });


        const lead = await Lead.findById(f.lead._id);
        if (lead && !lead.nextFollowUpDate) {
          lead.nextFollowUpDate = f.dueDate;
          await lead.save();
        }
      }

      if (dueFollowups.length > 0) {
        console.log(
          `[ReminderJob] Processed ${dueFollowups.length} pending follow-ups at ${now.toISOString()}`
        );
      }
    } catch (err) {
      console.error("[ReminderJob] Error while running reminders", err);
    }
  };


  run();
  setInterval(run, 15 * 60 * 1000);
};

