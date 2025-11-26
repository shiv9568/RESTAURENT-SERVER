import serverless from 'serverless-http';
import app from '../../src/index';

// Wrap Express app for Netlify Functions
export const handler = serverless(app);
