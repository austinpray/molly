const _ = require("lodash");
const URI = require("urijs");
const crypto = require('crypto');
const cheerio = require('cheerio');
const moment = require('moment');
const formurlencoded = require('form-urlencoded');

const microcenterListKey = "microcenter_watch_list";
const microcenterPageCacheKey = function (url) {
  const urlHash = crypto
    .createHash('md5')
    .update(url)
    .digest("hex");
  return `microcenter_watch_list:${urlHash}`;
};
const microcenterPageCacheTime = 1500; // 25 minutes

const logPrepend = "microcenter_watcher";

const fetchUrl = function ({http, redis, url}) {
  return new Promise(function (resolve, reject) {
    // check if cached first
    const cacheKey = microcenterPageCacheKey(url);
    redis.get(cacheKey, function (err, resp) {
      if (!err && resp) {
        return resolve(resp);
      }

      http(url).get()(function (err, resp, body) {
        if (err) {
          console.error(logPrepend, url, err);
          return reject("some spooky error happened trying to fetch the url");
        }

        if (resp.statusCode !== 200) {
          console.error(logPrepend, url, resp.statusCode);
          return reject(`got spooky status code while fetching the url: ${resp.statusCode}`);
        }

        redis.setex(cacheKey, microcenterPageCacheTime, body);

        return resolve(body);
      });
    });

  });
};

const extractProductInfoFromPage = function(body) {
  const defaultProduct = {
    lastChecked: new Date()
  };

  if (!body) {
    return defaultProduct;
  }

  const $ = cheerio.load(body);

  const nameElement = $("[itemprop=name] span");
  const pricingElement = $("#pricing");
  const inventoryElement = $(".inventoryCnt");

  return Object.assign(
    {},
    defaultProduct,
    {
      name: nameElement.length ? nameElement.text() : null,
      price: pricingElement.length ? pricingElement.prop('content') : null,
      stock: inventoryElement.length ? inventoryElement.text() : null,
    }
  );
};

const getProductInfo = function({http, redis, url}) {
  return new Promise(function (resolve, reject) {
    fetchUrl({http, redis, url})
      .then(function(body) {
        resolve(extractProductInfoFromPage(body));
      })
      .catch(reject);
  })
};

const urlIsValid = function ({http, redis}, url) {
  const urlInstance = URI(url);
  const hostIsMicrocenter = urlInstance.hostname() === "www.microcenter.com";
  const isProductPage = urlInstance.segment(0) === "product";

  return hostIsMicrocenter && isProductPage;
};

exports.microcenterAdd = _.curry(function ({redis, http}, message) {
  const url = message.match[1];
  //redis.rpush(microcenterListKey, );
  if (!urlIsValid(http, url)) {
    return message.reply("Not a valid microcenter URL, needs to be a product page");
  }

  const urlInstance = URI(url).setSearch("storeId", 131);

  const urlString = urlInstance.toString();
  redis.hexists(microcenterListKey, urlString, function (err, resp) {
    if (err) {return;}

    if (resp !== 0) {
      return message.reply("Already watching this url");
    }

    message.reply("Getting info about this product...");

    getProductInfo({http, redis, url: urlString}).then(function (data) {
      redis.hset(microcenterListKey, urlString, JSON.stringify(data), function (err, resp) {
        if (err) {
          console.error(logPrepend, "add", error);
          return message.reply("could not add url");
        }

        message.reply("Added successfully");
      });
    });

  });
});

exports.microcenterRemove = _.curry(function ({redis}, message) {
  const index = message.match[1];
  redis.hdel(microcenterListKey, index, function (err, reply) {
    if (!err && reply) {
      message.reply(`removed watch item #${index} successfully`)
    }
  });
});

function printListOfWatchItems(items) {
  if (!_.isPlainObject(items)) {
    return "No items yet";
  }

  return _.reduce(items, function (result, value, key) {
    value = JSON.parse(value);
    return result + `
*${value.name}*
    \$${value.price}
    ${value.stock}
    Last checked ${moment(value.lastChecked).fromNow()}
    ${key}`;
  }, "Watched Items at the Richardson Microcenter:\n");
}

exports.microcenterList = _.curry(function ({redis, http}, message) {
  redis.hgetall(microcenterListKey, function (err, reply) {
    return message.reply(printListOfWatchItems(reply));
  });
});

exports.updateProductInfo = function ({http, redis}) {
  return new Promise(function (resolve, reject) {
    redis.hkeys(microcenterListKey, function (err, reply) {

      if (!reply || reply.length < 1) {
        return resolve("done");
      }

      let delayCounter = 0;
      let increment = 10000;
      _.forEach(reply, function (url, index, collection) {
        _.delay(({http, redis, url}) => getProductInfo({http, redis, url})
          .then(function (data) {
            redis
              .multi()
              .hget(microcenterListKey, url)
              .hset(microcenterListKey, url, JSON.stringify(data))
              .exec(function (err, [oldData, ...rest]) {
                if (err) {
                  console.error(logPrepend, "update", error);
                }

                oldData = JSON.parse(oldData);

                if (oldData && oldData.stock !== data.stock) {
                  console.log(logPrepend, "update", "found new data", oldData, data)
                  http("https://slack.com/api/chat.postMessage")
                    .header('content-type', 'application/x-www-form-urlencoded')
                    .post(formurlencoded({
                      token: process.env.HUBOT_SLACK_TOKEN,
                      channel: "#quakecon",
                      text: `Microcenter update: something changed with ${url}. Stock went from ${oldData.stock} to ${data.stock}`,
                      as_user: true
                    }))(function (err) {
                      if (err) { console.log(err); }
                    });
                }

                console.log(logPrepend, "update", `updated ${url}`);
                if (index >= collection.length - 1)  {
                  resolve("done");
                }
            });
          })
          .catch(function (err) {
            console.error(logPrepend, "update", err);
            reject(err);
          }), delayCounter, {http, redis, url});
        delayCounter += increment;
      })
    });
  });
};
