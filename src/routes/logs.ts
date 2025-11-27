import express from 'express';
import SystemLog from '../models/SystemLog';
import { sendSystemAlert } from '../utils/email';

const router = express.Router();

// Get all logs
router.get('/', async (req, res) => {
    try {
        const logs = await SystemLog.find().sort({ timestamp: -1 }).limit(100);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching logs' });
    }
});

// Create a log
router.post('/', async (req, res) => {
    try {
        const { level, message, details, service } = req.body;
        const log = new SystemLog({ level, message, details, service });
        await log.save();

        // Emit socket event if it's an error
        const io = (req as any).io;
        if (io) {
            io.emit('system_error', log);
        }

        if (level === 'error') {
            sendSystemAlert(log);
        }

        res.status(201).json(log);
    } catch (error) {
        res.status(500).json({ message: 'Error creating log' });
    }
});

// Clear logs
router.delete('/', async (req, res) => {
    try {
        await SystemLog.deleteMany({});
        res.json({ message: 'Logs cleared' });
    } catch (error) {
        res.status(500).json({ message: 'Error clearing logs' });
    }
});

// Test Error Route
router.get('/test-error', async (req, res, next) => {
    const error = new Error('This is a simulated backend error for testing purposes.');
    next(error);
});

export default router;
