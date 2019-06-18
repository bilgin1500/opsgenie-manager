const fetch = require("node-fetch");
const argv = require("yargs");
const faker = require("faker");
// const mocks = require("./mocks");

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
const servicesUrl = "/v1/services";

// API pagination defaults
const paginationDefaults = {
  offset: 0,
  limit: 25,
  sort: "createdAt",
  order: "desc"
};

/**
 * Fetch wrapper
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
    .catch(error => {
      console.error(error);
      console.log(
        "\nFor detailed information about response codes please refer to https://docs.opsgenie.com/docs/response#section-response-codes\n"
      );
    });

/**
 * This function collects all the paginated data and returns the merged collection
 * @param {function} apiCall - The API call to run during the loop
 */
const collect = async apiCall => {
  let allData = [];
  let currPage = 0;

  while (currPage >= 0) {
    let newOffsetParams = {
      ...paginationDefaults,
      ...{ offset: paginationDefaults.limit * currPage }
    };
    const response = await apiCall(newOffsetParams);

    if (response.data) {
      allData = [...allData, ...response.data];

      if (response.paging && response.paging.next) {
        currPage++;
      } else {
        currPage = -1;
      }
    }
  }

  return allData;
};

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
 * https://docs.opsgenie.com/docs/alert-api
 */
const mockAlert = () => {
  return {
    message: faker.lorem.sentence(),
    alias: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    visibleTo: [
      {
        name: `team-${faker.helpers
          .slugify(faker.random.word())
          .toLowerCase()}`,
        type: "team"
      },
      {
        username: faker.internet.email(),
        type: "user"
      }
    ],
    actions: [faker.hacker.verb(), faker.hacker.verb()],
    tags: [faker.random.word(), faker.random.word()],
    details: {
      key1: faker.random.word(),
      key2: faker.random.word()
    },
    entity: faker.random.words(),
    priority: "P1"
  };
};

/**
 * https://docs.opsgenie.com/docs/team-api
 */
const mockTeam = () => {
  return {
    name: faker.random.word(),
    description: faker.lorem.sentence()
  };
};

/**
 * https://docs.opsgenie.com/docs/service-api
 */
const mockService = async () => {
  const teamList = await opsgenie.teams.list();
  const randomTeamId =
    teamList.data[Math.floor(Math.random() * teamList.data.length)].id;

  return {
    name: faker.random.words(),
    teamId: randomTeamId,
    description: faker.lorem.sentence()
  };
};

/**
 * The final API to expose
 */
const opsgenie = {
  alerts: {
    list: params => {
      const paginationParams = new URLSearchParams(
        Object.entries(params || paginationDefaults)
      );
      return request({ url: `${args.host}${alertsUrl}?${paginationParams}` });
    },
    create: () =>
      request({
        url: `${args.host}${alertsUrl}`,
        method: "POST",
        data: mockAlert()
      }),
    getAll: () => collect(opsgenie.alerts.list),
    deleteAll: async () => {
      const allAlerts = await opsgenie.alerts.getAll();
      const allAlertIds = allAlerts.reduce((acc, curr) => {
        return [...acc, curr.id];
      }, []);

      for (const alertId of allAlertIds) {
        const response = await request({
          url: `${args.host}${alertsUrl}/${alertId}`,
          method: "DELETE"
        });
        console.log(response);
      }
    }
  },
  teams: {
    list: () => request({ url: `${args.host}${teamsUrl}` }),
    create: () =>
      request({
        url: `${args.host}${teamsUrl}`,
        method: "POST",
        data: mockTeam()
      })
  },
  services: {
    list: () => request({ url: `${args.host}${servicesUrl}` }),
    create: async () => {
      const mockData = await mockService();

      return request({
        url: `${args.host}${servicesUrl}`,
        method: "POST",
        data: mockData
      });
    }
  }
};

/**
 * Examples while argv API is still in progress, uncomment to use them:
 */

/*
  opsgenie.alerts.list().then(response => console.log(response));
  opsgenie.teams.list().then(response => console.log(response));
  opsgenie.services.list().then(response => console.log(response));

  opsgenie.alerts.getAll().then(response => console.log(response));

  opsgenie.alerts.deleteAll();

  opsgenie.alerts.create().then(response => console.log(response));
  opsgenie.teams.create().then(response => console.log(response));
  opsgenie.services.create().then(response => console.log(response));

  bulk(26, opsgenie.alerts.create);
  bulk(40, opsgenie.teams.create);
  bulk(40, opsgenie.services.create);
*/
