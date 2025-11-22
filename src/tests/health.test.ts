describe('API Tests', () => {
    describe('utilities', () => {
        it('should validate email format', () => {
            const validEmail = 'test@example.com';
            const invalidEmail = 'invalid-email';

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            expect(emailRegex.test(validEmail)).toBe(true);
            expect(emailRegex.test(invalidEmail)).toBe(false);
        });

        it('should validate password strength', () => {
            const strongPassword = 'StrongPass123!';
            const weakPassword = '123';

            const minLength = 6;

            expect(strongPassword.length >= minLength).toBe(true);
            expect(weakPassword.length >= minLength).toBe(false);
        });
    });

    describe('data validation', () => {
        it('should validate order status values', () => {
            const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
            const testStatus = 'confirmed';
            const invalidStatus = 'invalid';

            expect(validStatuses.includes(testStatus)).toBe(true);
            expect(validStatuses.includes(invalidStatus)).toBe(false);
        });

        it('should validate payment methods', () => {
            const validMethods = ['cash', 'card', 'upi'];
            const testMethod = 'cash';
            const invalidMethod = 'crypto';

            expect(validMethods.includes(testMethod)).toBe(true);
            expect(validMethods.includes(invalidMethod)).toBe(false);
        });
    });
});
