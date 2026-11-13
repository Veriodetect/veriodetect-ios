import handler from '../../../backend-candidate/netlify/functions/x-posts.mjs';
export default handler;
export const config={path:'/api/x-posts',rateLimit:{windowLimit:10,windowSize:86400,aggregateBy:['ip']}};
