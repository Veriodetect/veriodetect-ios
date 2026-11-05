import handler from '../../../backend-candidate/netlify/functions/x-status.mjs';
export default handler;
export const config={path:'/api/x-status',rateLimit:{windowLimit:30,windowSize:86400,aggregateBy:['ip']}};
