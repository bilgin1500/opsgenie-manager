const fetch = require("node-fetch");
const argv = require("yargs").argv;
const mocks = require("./mocks");

/**
 * TODO
 * - Finalize argv API:
 *  - node opsgenie create 12 alerts
 *  - node opsgenie delete all teams
 *  - node opsgenie get alert 23
 *  - node opsgenie list alerts --apikey 6e2e1a46-494e-4919-a111-3da01dea68f2 --host https://bozkan-api.opsgeni.us/
 */

// Base config
const baseApiUrl = "https://bozkan-api.opsgeni.us/";
const apiKey = "6e2e1a46-494e-4919-a111-3da01dea68f2";

// API endpoints
const alertsUrl = "/v2/alerts";
const alertsUrl = "/v2/alerts";

/* console.log(argv);
const endpointNode = argv._[2];
const endpointAction = argv._[0];
const quantity = argv._[1]; */

/**
 * The core fetch object
 * @param {object} opts - Options parameter, accepts url, method, apiKey and data
 */
const request = opts =>
  fetch(opts.url, {
    method: opts.method || "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `GenieKey ${opts.apiKey}`
    },
    body: opts.data ? JSON.stringify(opts.data) : null
  })
    .then(response => {
      if (!response.ok || (response.status < 200 || response.status >= 300)) {
        throw Error(response.statusText);
      }

      return response;
    })
    .then(response => response.json())
    .catch(error => console.error(error));

/**
 * Async bulk action executor
 * @param {number} quantity - how many times to repeat the action
 * @param {function} action - A function to execute asynchronously,
 * the current index number will be supplied
 */
const bulk = async (quantity, action) => {
  for (let i = 0; i < quantity; i++) {
    const curr = i + 1; // bypass 0
    await action.call(undefined, curr);
    console.log("Created/deleted/updated xx", curr);
  }

  console.log(`${quantity} xx have been xx.`);
};

/**
 * The final API to expose
 */
const opsgenie = {
  alerts: {
    list: () => request({ url: `${baseApiUrl}${alertsUrl}`, apiKey }),
    create: () =>
      request({
        apiKey,
        url: `${baseApiUrl}${alertsUrl}`,
        method: "POST",
        data: mocks.alert()
      })
  }
};

// opsgenie.alerts.list().then(response => console.log(response));
bulk(12, opsgenie.alerts.create);
// console.log(mocks.alert());
