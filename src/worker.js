// Reached only through the yummlab-site Worker's service binding, with the
// original URL (path still starts with /de-faults/). Serves ./public as is,
// so public/_headers applies to every response, except /de-faults/th/ below.
import "../public/de-faults/i18n.js"; // sets globalThis.DEFAULTS_I18N, the same copy the page uses

/* ---------- Thai page ---------- */
// /de-faults/th/ is index.html with the Thai copy filled in here, so crawlers
// that index the raw HTML get Thai text, a Thai <title> and their own canonical.
const PAGE_PATH = "/de-faults/";
const TH_PATH = "/de-faults/th/";
const TH_URL = `https://yummlab.site${TH_PATH}`;
const TH = globalThis.DEFAULTS_I18N.th;

function setAttr(name, value) {
  return { element: (el) => el.setAttribute(name, value) };
}

async function thaiPage(request, env) {
  // A fresh GET without conditional headers: the asset server's 304/ETag
  // describe the English index.html, not this rewritten body.
  const asset = await env.ASSETS.fetch(new Request(new URL(PAGE_PATH, request.url), { method: request.method }));
  if (!asset.ok) return asset;

  const res = new HTMLRewriter()
    .on("html", setAttr("lang", "th"))
    .on("title", { element: (el) => el.setInnerContent(TH["meta.title"]) })
    .on('meta[name="description"]', setAttr("content", TH["meta.desc"]))
    .on('meta[property="og:title"]', setAttr("content", TH["meta.title"]))
    .on('meta[property="og:description"]', setAttr("content", TH["meta.desc"]))
    .on('meta[property="og:url"]', setAttr("content", TH_URL))
    .on('meta[property="og:locale"]', setAttr("content", "th_TH"))
    .on('meta[property="og:locale:alternate"]', setAttr("content", "en_US"))
    .on('link[rel="canonical"]', setAttr("href", TH_URL))
    // Thai pages link to the Thai home page
    .on('a[href="/"]', setAttr("href", "/th/"))
    .on("[data-i18n]", {
      element(el) {
        const value = TH[el.getAttribute("data-i18n")];
        if (typeof value === "string") el.setInnerContent(value);
      },
    })
    .on("[data-i18n-aria]", {
      element(el) {
        const value = TH[el.getAttribute("data-i18n-aria")];
        if (typeof value === "string") el.setAttribute("aria-label", value);
      },
    })
    .transform(asset);

  const headers = new Headers(res.headers);
  headers.delete("ETag");
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === TH_PATH.slice(0, -1)) {
      url.pathname = TH_PATH;
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === TH_PATH) return thaiPage(request, env);
    return env.ASSETS.fetch(request);
  },
};
