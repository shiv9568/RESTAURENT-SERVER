import express from 'express';
import Table from '../models/Table.js';

const router = express.Router();

// Get all tables
router.get('/', async (req, res) => {
    try {
        const tables = await Table.find().sort({ tableNumber: 1 });
        res.json(tables);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching tables' });
    }
});

// Create a new table
router.post('/', async (req, res) => {
    try {
        const { tableNumber, capacity } = req.body;

        const existingTable = await Table.findOne({ tableNumber });
        if (existingTable) {
            return res.status(400).json({ message: 'Table number already exists' });
        }

        const newTable = new Table({
            tableNumber,
            capacity,
            status: 'available'
        });

        const savedTable = await newTable.save();
        res.status(201).json(savedTable);
    } catch (err) {
        res.status(500).json({ message: 'Error creating table' });
    }
});

// Delete a table
router.delete('/:id', async (req, res) => {
    try {
        await Table.findByIdAndDelete(req.params.id);
        res.json({ message: 'Table deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting table' });
    }
});

// Update table status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const table = await Table.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json(table);
    } catch (err) {
        res.status(500).json({ message: 'Error updating table status' });
    }
});

export default router;
