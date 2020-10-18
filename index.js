const colors = require('colors');
const Waf = require('mini-waf/wafbase');
const wafrules = require('mini-waf/wafrules');
const magicproxy = require('magic-reverse-proxy');

appssl.use(Waf.WafMiddleware(wafrules.DefaultSettings));

const HTTP_PORT = 80;
const HTTPS_PORT = 443;

const proxy_cfg = {
  enable_hsts: true,
  allow_unknown_host: false,
  http: {
    port: HTTP_PORT,
    enabled: true,
    start_callback: function () {
      console.log(`Started HTTP service in port ${HTTP_PORT}.`);
    },
    middlewares: [
      Waf.WafMiddleware(rules.DefaultSettings)
    ]
  },
  https: {
    port: HTTPS_PORT,
    enabled: true,
    start_callback: function () {
      console.log(`Started HTTPS service in port ${HTTPS_PORT}.`);
    },
    middlewares: [
      Waf.WafMiddleware(rules.DefaultSettings)
    ],
    sslkey: fs.readFileSync(path.join(__dirname, 'certs/privkey.pem')),
    sslcert: fs.readFileSync(path.join(__dirname, 'certs/cert.pem')),
    sslchain: fs.readFileSync(path.join(__dirname, 'certs/chain.pem'))
  },
  proxies: [
    {
      domain: 'api.amstt.com.br',
      timeout: 10000,
      round: 0,
      destination: ['http://127.0.0.1:8080/']
    },
    {
      domain: 'painel.amstt.com.br',
      timeout: 10000,
      round: 0,
      destination: ['http://127.0.0.1:8081/']
    },
    {
      domain: 'consultas.amstt.com.br',
      timeout: 10000,
      round: 0,
      destination: ['http://127.0.0.1:8082/']
    }
  ],
  default_proxy: {
    timeout: 10000,
    round: 0,
    destination: ['http://127.0.0.1:8080/']
  }
};

const proxy = magicproxy(proxy_cfg);

proxy.bind();
