// Reached only through the yummlab-site Worker's service binding, with the
// original URL (path still starts with /de-faults/). Serves ./public as is,
// so public/_headers applies to every response.
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
