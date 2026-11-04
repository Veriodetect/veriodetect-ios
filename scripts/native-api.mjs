// Native transport only: no cookies, site passwords, admin tokens or X credentials.
export function createNativeFetch(http, origin) {
  return async (path, options = {}) => {
    const url = new URL(path, origin);
    const method = options.method || 'GET';
    const allowed = {'/api/x-status': 'GET', '/api/x-posts': 'GET', '/api/access-request': 'POST'};
    if (url.origin !== origin || allowed[url.pathname] !== method) {
      throw new Error('Unsupported native API request.');
    }
    const headers = options.headers || {};
    const reply = await http.request({
      url: url.href, method, headers,
      ...(options.body ? {data: JSON.parse(options.body)} : {}),
      responseType: 'text', connectTimeout: 15000, readTimeout: 60000,
      disableRedirects: true,
    });
    const text = typeof reply.data === 'string' ? reply.data : JSON.stringify(reply.data);
    return {
      status: reply.status, ok: reply.status >= 200 && reply.status < 300,
      text: async () => text,
      json: async () => {
        try { return JSON.parse(text); }
        catch { throw new Error(`Server returned ${reply.status} instead of JSON. Check staging access and function deployment.`); }
      },
    };
  };
}
