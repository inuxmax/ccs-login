/**
 * CCS CloudFlare Worker - Redirect to npm Installation
 *
 * Legacy shell installers are deprecated. This worker now redirects
 * all /install* and /uninstall* requests to the npm installation docs.
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const docsUrl = 'https://docs.ccs.kaitran.ca/getting-started/installation';

    // Redirect all install/uninstall paths to npm installation docs
    if (
      url.pathname === '/install' ||
      url.pathname === '/install.sh' ||
      url.pathname === '/install.ps1' ||
      url.pathname === '/uninstall' ||
      url.pathname === '/uninstall.sh' ||
      url.pathname === '/uninstall.ps1'
    ) {
      return Response.redirect(docsUrl, 301);
    }

    return new Response('Not Found', { status: 404 });
  }
};