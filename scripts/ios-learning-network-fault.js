// CI-only failure injection. Keep bundled application routes available while
// blocking remote services AND bundled image fetch, so image success needs disk.
(() => {
  if (window.__qaLearningOffline) return;
  window.__qaLearningOffline = true;
  const local = window.location;
  const blocked = input => {
    const target = new URL(typeof input === 'object' && input && 'url' in input ? input.url : String(input), local.href);
    return target.protocol !== local.protocol || target.host !== local.host ||
      target.pathname.startsWith('/api/') || /^\/assets\/(?:meridians|acupoint-photos)\//.test(target.pathname);
  };
  // Capacitor can install its fetch/XHR bridge after document-start scripts.
  // Reapply only when that changes the actual functions under test.
  let wrappedFetch, wrappedXHR;
  const install = () => {
    if (window.fetch !== wrappedFetch) {
      const originalFetch = window.fetch.bind(window);
      wrappedFetch = (input, init) => blocked(input)
        ? Promise.reject(new TypeError('QA offline network or learning-image block')) : originalFetch(input, init);
      window.fetch = wrappedFetch;
    }
    if (window.XMLHttpRequest !== wrappedXHR) {
      const OriginalXHR = window.XMLHttpRequest;
      wrappedXHR = function(...constructorArgs) {
        // Capacitor's XMLHttpRequest constructor supplies instance methods, so
        // prototype-only interception does not block its native HTTP transport.
        const request = new OriginalXHR(...constructorArgs);
        const open = request.open, send = request.send;
        let target;
        request.open = function(method, url, ...args) { target=url; return open.call(this, method, url, ...args); };
        request.send = function(...args) {
          if (blocked(target)) throw new Error('QA offline network or learning-image block');
          return send.apply(this, args);
        };
        return request;
      };
      Object.setPrototypeOf(wrappedXHR, OriginalXHR); wrappedXHR.prototype = OriginalXHR.prototype;
      window.XMLHttpRequest = wrappedXHR;
    }
  };
  install();
  let attempts = 0;
  const timer = setInterval(async () => {
    attempts++;
    install();
    try {
      let f=false, x=false, image=false;
      try { await window.fetch('/api/health'); } catch { f=true; }
      try { const q=new window.XMLHttpRequest(); q.open('GET','https://yandaoguoxue.yandao.vip/api/health'); q.send(); } catch { x=true; }
      try { await window.fetch('/assets/acupoint-photos/hegu-li4-mk2010.jpg'); } catch { image=true; }
      if(window.webkit?.messageHandlers?.qaOfflineNetworkProof) {
        window.webkit.messageHandlers.qaOfflineNetworkProof.postMessage({fetchBlocked:f,xhrBlocked:x,imageFetchBlocked:image,bundledRouteAllowed:!blocked('/offline/index.html')});
        if(f && x && image) clearInterval(timer);
      }
    } catch { /* Wait for the actual native bridge, never inject fixture data. */ }
    if(attempts>60)clearInterval(timer);
  },250);
})();
