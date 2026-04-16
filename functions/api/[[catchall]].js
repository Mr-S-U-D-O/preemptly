export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // We hardcode the fallback URL to your current Cloud Run instance,
  // but it can be overridden by adding BACKEND_URL in Cloudflare Pages Env Vars.
  const backendUrl = env.BACKEND_URL || "https://my-google-ai-studio-applet-1029860126053.us-west1.run.app";
  
  // Combine the backend domain with the exact path (e.g. /api/health) and query params
  const targetUrl = new URL(url.pathname + url.search, backendUrl);
  
  // Proxy the request to Cloud Run
  const proxyRequest = new Request(targetUrl, request);
  
  return fetch(proxyRequest);
}
