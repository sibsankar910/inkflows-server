import axios from "axios";
import cron from "node-cron";

export const cronSchedules = () => {
    // schedule a ping for every 10 minutes
    cron.schedule("*/1 * * * *", async () => {
        try {
            await axios.get(`${process.env.CURRENT_ORIGIN}`)
        } catch (error) {
            // console.error("Failed to exicute cron", error);
        }
    })
}