/**
 * Fee Scheduler — runs periodic fee maintenance jobs.
 *
 * Jobs:
 *   1. updateOverdueStatuses — marks past-due pending fees as overdue.
 *      Runs immediately on server start, then every 24 hours.
 *   2. checkUpcomingDeadlines — logs fees due within 7 days (notification hook).
 *      Runs immediately on server start, then every 24 hours.
 *
 * node-cron is not a listed dependency, so we use setInterval (24 h).
 * If node-cron is added later, replace the setInterval calls with cron.schedule.
 *
 * Requirements: 4.3, 4.4
 */

'use strict';

const { updateOverdueStatuses, checkUpcomingDeadlines } = require('../services/feeService');

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Run the overdue-status update job.
 * Errors are caught and logged so they never crash the server.
 */
async function runUpdateOverdue() {
  try {
    const count = await updateOverdueStatuses();
    if (count > 0) {
      console.log(`[feeScheduler] updateOverdueStatuses: ${count} record(s) updated.`);
    }
  } catch (err) {
    console.error('[feeScheduler] updateOverdueStatuses failed:', err.message);
  }
}

/**
 * Run the upcoming-deadlines check job.
 * In a production system this would trigger email/push notifications.
 * For now it logs the upcoming fees so the data is available for integration.
 */
async function runCheckUpcomingDeadlines() {
  try {
    const upcoming = await checkUpcomingDeadlines();
    if (upcoming.length > 0) {
      console.log(
        `[feeScheduler] checkUpcomingDeadlines: ${upcoming.length} fee(s) due within 7 days.`
      );
      // Notification hook — replace with actual email/push logic when ready
      for (const fee of upcoming) {
        console.log(
          `  → Student: ${fee.student_name} (${fee.student_email}), ` +
          `Fee: ${fee.amount}, Due: ${fee.due_date}`
        );
      }
    }
  } catch (err) {
    console.error('[feeScheduler] checkUpcomingDeadlines failed:', err.message);
  }
}

/**
 * Start all fee-related scheduled jobs.
 * Call this once during server initialisation.
 */
function startFeeScheduler() {
  // Run immediately on startup
  runUpdateOverdue();
  runCheckUpcomingDeadlines();

  // Schedule to run every 24 hours
  setInterval(runUpdateOverdue,          TWENTY_FOUR_HOURS_MS);
  setInterval(runCheckUpcomingDeadlines, TWENTY_FOUR_HOURS_MS);

  console.log('[feeScheduler] Fee scheduler started (24-hour interval).');
}

module.exports = { startFeeScheduler, runUpdateOverdue, runCheckUpcomingDeadlines };
