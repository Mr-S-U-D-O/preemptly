export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Use Cloudflare's Cache API to prevent hitting Reddit multiple times
  // for the exact same subreddit if multiple scrapers are running simultaneously.
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  let response = await cache.match(cacheKey);

  if (response) {
    console.log(`[Proxy] Serving ${targetUrl} from Edge Cache`);
    return response;
  }

  try {
    // Add a randomized generic user agent to bypass simple blocks
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0"
    ];
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    console.log(`[Proxy] Fetching fresh data from ${targetUrl}`);
    const upstreamResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent": randomUserAgent,
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      // This tells Cloudflare's internal fetch to cache it at the edge if possible
      cf: {
        cacheTtl: 60,
        cacheEverything: true,
      }
    });

    if (!upstreamResponse.ok) {
      return new Response(`Error fetching feed: ${upstreamResponse.status}`, { status: upstreamResponse.status });
    }

    const xml = await upstreamResponse.text();
    
    response = new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, s-maxage=60, max-age=60", // 1 minute cache
        "Access-Control-Allow-Origin": "*",
      }
    });

    // Store in Edge Cache for the next 60 seconds
    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { status: 500 });
  }
}
