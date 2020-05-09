const express = require('express');
const colors = require('colors');
const httpProxy = require('http-proxy');
const https = require('https');
const fs = require('fs');
const path = require('path');
const Waf = require('mini-waf/wafbase');
const wafrules = require('mini-waf/wafrules');

const appssl = express();
const app = express();

const ApiProxy = httpProxy.createProxyServer({ xfwd: false });

appssl.use(Waf.WafMiddleware(wafrules.DefaultSettings));


const DASH_ADDR = 'http://127.0.0.1:8081';
const SERVER_CLUSTER = [ 'http://127.0.0.1:8080' ];

var ROUND_ROBIN_IDX = 0;

function ScheduleNextServer(req, res, timeout){
  let c_idx = 0;
  (function RecursiveRoundRobin() {
    if (c_idx < SERVER_CLUSTER.length) {
      ApiProxy.web(req, res, { target: SERVER_CLUSTER[ROUND_ROBIN_IDX], timeout: timeout }, (e) => {
        RecursiveRoundRobin();
        console.log(`Redirect data traffic failed!`.yellow.bgRed + ` Source: ${req.ip.cyan} -/-> Destination: ${SERVER_CLUSTER[ROUND_ROBIN_IDX].cyan}`.green); 
      });
      ROUND_ROBIN_IDX = (ROUND_ROBIN_IDX + 1) % SERVER_CLUSTER.length;
      c_idx++;
    }
    else{
      console.log('Fatal Error!'.yellow.bgRed + ` All servers unavailable at ${new Date().toLocaleString().yellow}.`.cyan);
      res.set('Content-Type', 'text/html');
      res.status(502).end('<center><h1>502 Bad Gateway</h1></center><hr><center>https://github.com/MurylloEx/ZAES-Reverse-Proxy</center>');
    }
  })();
}

app.all('*', function(req, res){
  res.redirect(301, req.originalUrl);
});

appssl.all(['/adm', '/adm/*'], function(req, res){
  ApiProxy.web(req, res, { target: DASH_ADDR }, (e) => {
    console.log(`Redirect data traffic failed!`.yellow.bgRed + ` Source: ${req.ip.cyan} -/-> Destination: ${DASH_ADDR.cyan}`.green);
  });
});

appssl.all(['/zaes', '/zaes/*'], function(req, res){
  try{
    ScheduleNextServer(req, res, 10000);
  } catch(e) {
    res.status(500).end();
  }
});

appssl.all('*', function(req, res){
  if (req.headers.host.toUpperCase().indexOf("PORTAL.PIRACEMA.IO") != -1){
    ApiProxy.web(req, res, { target: 'http://127.0.0.1:7071' }, (e) => {
      console.log(`Redirect data traffic failed!`.yellow.bgRed + ` Source: ${req.ip.cyan} -/-> Destination: ${'127.0.0.1:7071'.cyan}`.green);
    });
  }
  else{
    ApiProxy.web(req, res, { target: 'http://127.0.0.1:7070' }, (e) => {
      console.log(`Redirect data traffic failed!`.yellow.bgRed + ` Source: ${req.ip.cyan} -/-> Destination: ${'127.0.0.1:7070'.cyan}`.green);
    });
  }
});


app.listen(80, () => {
  console.log(`\n--> Started Zaes Reverse Proxy!\n`.white.bgGreen + `\nRunning on port 80 (HTTP)...`.cyan);
});

https.createServer({
  key:  fs.readFileSync(path.join(__dirname, 'certs/privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs/cert.pem')),
  ca:   fs.readFileSync(path.join(__dirname, 'certs/chain.pem'))
}, appssl).listen(443, () => {
  console.log(`\n--> Started Zaes Reverse Proxy!\n`.white.bgGreen + `\nRunning on port 443 (HTTPS)...`.cyan);
  console.log(`Showing available Zaes Servers...\n`.yellow);
  for (let idx = 0; idx < SERVER_CLUSTER.length; idx++){
    console.log(`Server ${idx+1} with address ${SERVER_CLUSTER[idx].yellow.bgRed}`.green);
  }
  console.log('\nListening for incoming connections...\n'.cyan);
});