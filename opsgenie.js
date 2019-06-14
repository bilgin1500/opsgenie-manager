const fetch = require("node-fetch");
const argv = require("yargs");
const mocks = require("./mocks");

/**
 * TODO
 * - Finalize the `argv` API:
 *  - node opsgenie create 12 alerts
 *  - node opsgenie delete all teams
 *  - node opsgenie get alert 23
 *  - node opsgenie list alerts --apikey xxxx-xxxx-xxxx-xxxx --host https://api.opsgenie.com/
 * - Update the `console.log` statements properly.
 */

// Parsed arguments
const args = argv
  .usage("Usage: $0 -apikey [key] -host [url]")
  .demandOption(["apikey", "host"]).argv;

// const endpointNode = args._[2];
// const endpointAction = args._[0];
// const quantity = args._[1];

// API endpoints
const alertsUrl = "/v2/alerts";
const teamsUrl = "/v2/teams";

/**
 * The core fetch object
 * @param {object} opts - Options parameter, accepts url, method and data
 */
const request = opts =>
  fetch(opts.url, {
    method: opts.method || "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `GenieKey ${args.apikey}`
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
    console.log(`Bulk action ${curr} done.`);
  }

  console.log(`Total ${quantity} bulk actions done.`);
};

/**
 * The final API to expose
 */
const opsgenie = {
  alerts: {
    list: () => request({ url: `${args.host}${alertsUrl}` }),
    create: () =>
      request({
        url: `${args.host}${alertsUrl}`,
        method: "POST",
        data: mocks.alert()
      })
  },
  teams: {
    list: () => request({ url: `${args.host}${teamsUrl}` }),
    create: () =>
      request({
        url: `${args.host}${teamsUrl}`,
        method: "POST",
        data: mocks.team()
      })
  }
};

/**
 * Examples while argv API is still in progress, uncomment to use them:
 */
// opsgenie.alerts.list().then(response => console.log(response));
// opsgenie.teams.list().then(response => console.log(response));
// opsgenie.teams.create().then(response => console.log(response));
// bulk(30, opsgenie.alerts.create);
// bulk(40, opsgenie.teams.create);
// console.log(mocks.alert());
