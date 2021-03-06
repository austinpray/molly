console.log("Running cron");

const redis = require("redis").createClient(process.env.REDISTOGO_URL);
const {updateProductInfo} = require("../lib/microcenter");
const scopedClient = require("scoped-http-client");

const http = url => scopedClient.create(url);

updateProductInfo({http, redis})
  .then(function () {
    redis.quit();
  })
  .catch(function (err) {
    console.log("cron issue", err);
    redis.quit();
  });
