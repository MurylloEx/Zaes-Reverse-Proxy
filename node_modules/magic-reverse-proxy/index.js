const ProxyServer = require('./libs/proxysrv');
const Express = require('express');
const Https = require('https');
const FileSystem = require('fs');

const stdcfg = {
  enable_hsts: false,
  allow_unknown_host: true,
  http: {
    port: 55100,
    enabled: true,
    start_callback: function(){},
    middlewares: []
  },
  https: {
    port: 443,
    enabled: false,
    start_callback: function(){},
    middlewares: [],
    sslkey: '',
    sslcert: '',
    sslchain: ''
  },
  proxies: [],
  default_proxy: {
    destination: [],
    timeout: 10000,
    round: 0
  }
};

function is_set(val){
  return !((typeof val == 'undefined') || (val === null));
}

/**Generate default options for the input specified.
 * 
 * @param {stdcfg} options Options of proxy.
 */
function default_options(options) {
  let opts                = options || stdcfg;
  opts.enable_hsts        = !is_set(opts.enable_hsts) ? false : opts.enable_hsts;
  opts.allow_unknown_host = !is_set(opts.allow_unknown_host) ? true : opts.allow_unknown_host;
  opts.http               = opts.http || stdcfg.http;
  opts.https              = opts.https || stdcfg.https;
  opts.proxies            = opts.proxies || [];
  opts.default_proxy      = opts.default_proxy || stdcfg.default_proxy;
  return opts;
}

/**Create a new proxy object that contains the express app, appssl and the bind() function that starts all servers and listen on local port.
 * 
 * @param {stdcfg} options Options of proxy.
 */
function createProxy(options){
  let defOptions = default_options(options);
  let proxy = {
    app: Express(),
    appssl: Express(),
    config: defOptions,
    /**Bind the proxy on local port spcified in options of createProxy() function.
     * @returns {void} 
     */
    bind: function(){
      if (defOptions.http.enabled == true) {
        this.app.listen(defOptions.http.port, defOptions.http.start_callback);
      }
      if (defOptions.https.enabled == true) {
        Https.createServer({
          key: FileSystem.readFileSync(defOptions.https.sslkey),
          cert: FileSystem.readFileSync(defOptions.https.sslcert),
          ca: FileSystem.readFileSync(defOptions.https.sslchain)
        }, this.appssl).listen(defOptions.https.port, defOptions.https.start_callback);
      }
      defOptions.http.middlewares.forEach((middleware, idx, arr) => {
        this.app.use(middleware);
      });
      defOptions.https.middlewares.forEach((middleware, idx, arr) => {
        this.appssl.use(middleware);
      });
      if (defOptions.enable_hsts == true){
        //ALL COPYRIGHT OF EXPRESS-FORCE-HTTPS PACKAGE.
        //THIS METHOD WAS IMPROVED BECAUSE IT'S ORIGINALLY VULNERABLE.
        this.app.use(function(req,res,next) {
          let schema = (req.headers['x-forwarded-proto'] || '').toLowerCase();
          if (String(req.headers.host).indexOf('localhost')<0 && schema!=='https') {
            res.redirect('https://' + String(req.headers.host) + String(req.url));
          } else {
            next();
          }
        });
        this.appssl.use(ProxyServer(defOptions));
      }
      else{
        this.app.use(ProxyServer(defOptions));
      }
    }
  }
  return proxy;
}

module.exports = createProxy;
