import cron from 'node-cron';
import Table from '../models/Table';
import crypto from 'crypto';

// Function to generate a random token
const generateToken = () => {
    return crypto.randomBytes(16).toString('hex');
};

// Function to update all table tokens
export const updateTableTokens = async () => {
    try {
        const tables = await Table.find({});
        console.log(`Starting daily token update for ${tables.length} tables...`);

        for (const table of tables) {
            table.currentSessionToken = generateToken();
            await table.save();
        }

        console.log('✅ Daily table tokens updated successfully');
    } catch (error) {
        console.error('❌ Error updating table tokens:', error);
    }
};

// Initialize cron jobs
export const initCronJobs = () => {
    // Run every day at 4:00 AM
    cron.schedule('0 4 * * *', () => {
        console.log('⏰ Running scheduled daily token update...');
        updateTableTokens();
    });

    console.log('📅 Cron jobs initialized');
};
