const express = require('express');
const colors = require('colors');
const httpProxy = require('http-proxy');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const ApiProxy = httpProxy.createProxyServer();

const SERVER_CLUSTER = [
  'http://srv1.com.br',
  'http://srv2.com.br'
];

var ROUND_ROBIN_IDX = 0;

function ScheduleNextServer(req, res, timeout){
  let c_idx = 0;
  (function RecursiveRoundRobin() {
    if (c_idx < SERVER_CLUSTER.length) {
      console.log(`Redirecting traffic data`.white.bgGreen + ` Source: ${req.ip.cyan} -> Destination: ${SERVER_CLUSTER[ROUND_ROBIN_IDX].cyan}`.green);
      ApiProxy.web(req, res, { target: SERVER_CLUSTER[ROUND_ROBIN_IDX], timeout: timeout }, (e) => {
        RecursiveRoundRobin();
        console.log(`Redirect data traffic failed!`.yellow.bgRed + ` Source: ${req.ip.cyan} -/-> Destination: ${SERVER_CLUSTER[ROUND_ROBIN_IDX].cyan}`.green); 
      });
      ROUND_ROBIN_IDX = (ROUND_ROBIN_IDX + 1) % SERVER_CLUSTER.length;
      c_idx++;
    }
    else{
      console.log('Fatal Error!'.yellow.bgRed + ` All servers unavailable at ${new Date().toLocaleString().yellow}.`.cyan);
      res.status(500).end();
    }
  })();
}

app.all('*', function(req, res){
  try{
    ScheduleNextServer(req, res, 3000);
  } catch(e) {
    res.status(500).end();
  }
});

https.createServer({
  key:  fs.readFileSync(path.join(__dirname, 'certs/privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs/cert.pem')),
  ca:   fs.readFileSync(path.join(__dirname, 'certs/chain.pem'))
}, app).listen(443, () => {
  console.log(`\n--> Started Zaes Reverse Proxy!\n`.white.bgGreen + `\nRunning on port 443 (HTTPS)...`.cyan);
  console.log(`Showing available Zaes Servers...\n`.yellow);
  for (let idx = 0; idx < SERVER_CLUSTER.length; idx++){
    console.log(`Server ${idx+1} with address ${SERVER_CLUSTER[idx].yellow.bgRed}`.green);
  }
  console.log('\nListening for incoming connections...\n'.cyan);
});