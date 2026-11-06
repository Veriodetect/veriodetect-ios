import handler from '../../../backend-candidate/netlify/functions/access-delete.mjs';
export default handler;
export const config={path:'/api/access-delete',rateLimit:{windowLimit:30,windowSize:3600,aggregateBy:['ip']}};
