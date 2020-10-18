const Wildcard = require('wildcard');
const HttpProxy = require('http-proxy');

const ProxyAPI = HttpProxy.createProxyServer({ xfwd: false, preserveHeaderKeyCase: true });

function BadGateway(res){
  if (!res.badgateway){
    res.badgateway = true;
    res.set('Content-Type', 'text/html');
    res.status(502).end('<center><h1>502 Bad Gateway</h1></center><hr><center>https://github.com/MurylloEx/Magic-Proxy</center>');
  }
}

module.exports = function (defOptions) {
  return (req, res) => {
    let proxied = false;
    defOptions.proxies.forEach((proxyObj, idx, proxies) => {
      if (Wildcard(String(proxyObj.domain).toUpperCase(), String(req.hostname).toUpperCase()) && !proxied) {
        ProxyAPI.web(req, res, { target: proxyObj.destination[proxyObj.round], timeout: proxyObj.timeout }, (e) => {
          BadGateway(res);
        });
        defOptions.proxies[idx].round = (defOptions.proxies[idx].round + 1) % defOptions.proxies[idx].destination.length;
        proxied = true;
      }
    });
    if (!proxied && (defOptions.allow_unknown_host == true)) {
      ProxyAPI.web(req, res, { target: defOptions.default_proxy.destination[defOptions.default_proxy.round], timeout: defOptions.default_proxy.timeout }, (e) => {
        BadGateway(res);
      });
      defOptions.default_proxy.round = (defOptions.default_proxy.round + 1) % defOptions.default_proxy.destination.length;
    }
  }
}