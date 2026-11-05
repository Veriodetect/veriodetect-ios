import handler from '../../../backend-candidate/netlify/functions/access-request.mjs';
export default handler;
export const config={path:'/api/access-request',rateLimit:{windowLimit:5,windowSize:3600,aggregateBy:['ip']}};
