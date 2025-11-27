import SalesRecord from '../models/SalesRecord';
import Order, { IOrder } from '../models/Order';

/**
 * Get the start of day for a given date (set time to 00:00:00)
 */
function getStartOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Update sales record when an order is completed (delivered)
 * This should be called whenever an order status changes to 'delivered'
 */
export async function updateSalesRecord(order: IOrder): Promise<void> {
    try {
        // Only track completed (delivered) orders
        if (order.status !== 'delivered') {
            return;
        }

        const orderDate = getStartOfDay(order.createdAt || new Date());
        const restaurantId = order.restaurantId || undefined;

        // Calculate items count
        const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

        // Find or create the sales record for this date
        const existingRecord = await SalesRecord.findOne({
            date: orderDate,
            restaurantId: restaurantId,
        });

        if (existingRecord) {
            // Update existing record
            existingRecord.totalRevenue += order.total;
            existingRecord.totalOrders += 1;
            existingRecord.totalItems += itemsCount;
            existingRecord.averageOrderValue = existingRecord.totalRevenue / existingRecord.totalOrders;

            // Update payment methods
            const paymentMethod = order.paymentMethod || 'cash';
            if (paymentMethod === 'cash') existingRecord.paymentMethods.cash += order.total;
            else if (paymentMethod === 'card') existingRecord.paymentMethods.card += order.total;
            else if (paymentMethod === 'upi') existingRecord.paymentMethods.upi += order.total;
            else existingRecord.paymentMethods.online += order.total;

            // Update order types
            const orderType = order.orderType || 'delivery';
            if (orderType === 'delivery') existingRecord.orderTypes.delivery += 1;
            else if (orderType === 'pickup') existingRecord.orderTypes.pickup += 1;
            else existingRecord.orderTypes.dineIn += 1;

            await existingRecord.save();
        } else {
            // Create new record
            const paymentMethods = { cash: 0, card: 0, upi: 0, online: 0 };
            const orderTypes = { delivery: 0, pickup: 0, dineIn: 0 };

            const paymentMethod = order.paymentMethod || 'cash';
            if (paymentMethod === 'cash') paymentMethods.cash = order.total;
            else if (paymentMethod === 'card') paymentMethods.card = order.total;
            else if (paymentMethod === 'upi') paymentMethods.upi = order.total;
            else paymentMethods.online = order.total;

            const orderType = order.orderType || 'delivery';
            if (orderType === 'delivery') orderTypes.delivery = 1;
            else if (orderType === 'pickup') orderTypes.pickup = 1;
            else orderTypes.dineIn = 1;

            await SalesRecord.create({
                date: orderDate,
                restaurantId: restaurantId,
                totalRevenue: order.total,
                totalOrders: 1,
                cancelledOrders: 0,
                totalItems: itemsCount,
                averageOrderValue: order.total,
                paymentMethods,
                orderTypes,
            });
        }

        console.log(`[Sales Tracking] Updated sales record for ${orderDate.toISOString().split('T')[0]}`);
    } catch (error) {
        console.error('[Sales Tracking] Error updating sales record:', error);
        // Don't throw - we don't want to break order processing if sales tracking fails
    }
}

/**
 * Track cancelled order
 */
export async function trackCancelledOrder(order: IOrder): Promise<void> {
    try {
        const orderDate = getStartOfDay(order.createdAt || new Date());
        const restaurantId = order.restaurantId || undefined;

        // Find or create the sales record for this date
        const existingRecord = await SalesRecord.findOne({
            date: orderDate,
            restaurantId: restaurantId,
        });

        if (existingRecord) {
            existingRecord.cancelledOrders += 1;
            await existingRecord.save();
        } else {
            // Create new record
            await SalesRecord.create({
                date: orderDate,
                restaurantId: restaurantId,
                totalRevenue: 0,
                totalOrders: 0,
                cancelledOrders: 1,
                totalItems: 0,
                averageOrderValue: 0,
                paymentMethods: { cash: 0, card: 0, upi: 0, online: 0 },
                orderTypes: { delivery: 0, pickup: 0, dineIn: 0 },
            });
        }

        console.log(`[Sales Tracking] Tracked cancellation for ${orderDate.toISOString().split('T')[0]}`);
    } catch (error) {
        console.error('[Sales Tracking] Error tracking cancellation:', error);
    }
}

/**
 * Rebuild all sales records from existing orders
 * Useful for initial migration or data recovery
 */
export async function rebuildSalesRecords(): Promise<void> {
    try {
        console.log('[Sales Tracking] Rebuilding sales records from existing orders...');

        // Clear existing sales records
        await SalesRecord.deleteMany({});

        // Get all delivered orders
        const deliveredOrders = await Order.find({ status: 'delivered' }).sort({ createdAt: 1 });
        const cancelledOrders = await Order.find({ status: 'cancelled' }).sort({ createdAt: 1 });

        console.log(`[Sales Tracking] Found ${deliveredOrders.length} delivered orders to process`);

        // Process delivered orders
        for (const order of deliveredOrders) {
            await updateSalesRecord(order);
        }

        // Process cancelled orders
        for (const order of cancelledOrders) {
            await trackCancelledOrder(order);
        }

        console.log('[Sales Tracking] Sales records rebuild complete');
    } catch (error) {
        console.error('[Sales Tracking] Error rebuilding sales records:', error);
        throw error;
    }
}

/**
 * Get sales data for a date range
 */
export async function getSalesData(
    startDate: Date,
    endDate: Date,
    restaurantId?: string
): Promise<any[]> {
    const filter: any = {
        date: {
            $gte: getStartOfDay(startDate),
            $lte: getStartOfDay(endDate),
        },
    };

    if (restaurantId) {
        filter.restaurantId = restaurantId;
    }

    const records = await SalesRecord.find(filter).sort({ date: 1 });
    return records;
}

/**
 * Get monthly sales summary
 */
export async function getMonthlySales(year: number, month: number, restaurantId?: string): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    const records = await getSalesData(startDate, endDate, restaurantId);

    const summary = {
        year,
        month,
        totalRevenue: 0,
        totalOrders: 0,
        totalItems: 0,
        averageOrderValue: 0,
        dailyRecords: records,
    };

    for (const record of records) {
        summary.totalRevenue += record.totalRevenue;
        summary.totalOrders += record.totalOrders;
        summary.totalItems += record.totalItems;
    }

    summary.averageOrderValue = summary.totalOrders > 0 ? summary.totalRevenue / summary.totalOrders : 0;

    return summary;
}
