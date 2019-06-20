const argv = require("yargs");
const faker = require("faker");
const request = require("requestretry");
const cliProgress = require("cli-progress");
const inquirer = require("inquirer");

/**
 * TODO
 * - Bulk should be thenable.
 * - Manage the errors properly. (To test, close the services and make the requests, you'll get 503)
 * - Finalize the API. Maybe http://tj.github.io/commander.js can be useful.
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
const integrationsUrl = "/v2/integrations";

// API pagination defaults
const paginationDefaults = {
  offset: 0,
  limit: 25,
  sort: "createdAt",
  order: "desc"
};

// Progress bar instance
const progressBar = new cliProgress.Bar({}, cliProgress.Presets.shades_classic);

// Base config for retry strategy
const retryConfig = {
  maxAttempts: 5,
  retryDelay: 5000,
  retryStrategy: request.RetryStrategies.HTTPOrNetworkError
};

/**
 * Request wrapper
 * @param {object} opts - Options parameter, accepts url, method and data
 */
const fetch = async opts => {
  try {
    const response = await request({
      ...{
        url: args.host,
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `GenieKey ${args.apikey}`
        },
        json: true,
        fullResponse: false
      },
      ...opts,
      ...retryConfig
    });
    return response;
  } catch (error) {
    console.log(
      `🔴 ${response.status} - ${
        response.statusText
      } \nℹ️ For detailed information about response codes please refer to https://docs.opsgenie.com/docs/response#section-response-codes\n`
    );
  }
};

/**
 * This function collects all the paginated data and returns the merged collection
 *
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
 * Async bulk API action executor. Helps you to call an endpoint {quantity} times.
 *
 * @param {number} quantity - how many times to repeat the action
 * @param {function} apiCall - A API call to execute asynchronously,
 * the current index number will be supplied as an argument.
 */
const bulk = async (quantity, apiCall) => {
  try {
    progressBar.start(quantity, 0);

    for (let i = 0; i <= quantity; i++) {
      await apiCall.call(undefined, i);
      progressBar.update(i);
    }

    progressBar.stop();

    console.log(`\n✅ x ${quantity} times. Successfully finished the actions.`);
  } catch (error) {
    console.log("\n❌ Sorry, something bad happened. Couldn't finish the job.");
    console.error(error);
  }
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
 * https://docs.opsgenie.com/docs/integration-api#section-create-a-new-integration-action
 */
const mockIntegrationAction = () => {
  const types = ["create", "close", "acknowledge", "addNote"];

  return {
    type: types[Math.floor(Math.random() * types.length)],
    name: faker.random.words(),
    order: 1,
    filter: {
      conditionMatchType: "Match Any Condition",
      conditions: [
        {
          field: "tags",
          isNot: false,
          operation: "Is Empty",
          expectedValue: ""
        }
      ]
    },
    source: faker.random.word(),
    message: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    appendAttachments: true,
    alertActions: [],
    ignoreAlertActionsFromPayload: false,
    recipients: [],
    ignoreRecipientsFromPayload: false,
    ignoreTeamsFromPayload: false,
    tags: [],
    ignoreTagsFromPayload: false,
    extraProperties: {},
    ignoreExtraPropertiesFromPayload: false
  };
};

/**
 * The final API to expose
 */
const opsgenie = {
  alerts: {
    list: params =>
      fetch({
        url: `${args.host}${alertsUrl}`,
        qs: params || paginationDefaults
      }),
    create: () =>
      fetch({
        url: `${args.host}${alertsUrl}`,
        method: "POST",
        body: mockAlert()
      }),
    getAll: () => collect(opsgenie.alerts.list),
    deleteAll: async () => {
      const allAlerts = await opsgenie.alerts.getAll();
      const allAlertIds = allAlerts.reduce((acc, curr) => {
        return [...acc, curr.id];
      }, []);

      bulk(allAlertIds.length, i =>
        fetch({
          url: `${args.host}${alertsUrl}/${allAlertIds[i]}`,
          method: "DELETE"
        })
      );
    }
  },
  teams: {
    list: () => fetch({ url: `${args.host}${teamsUrl}` }),
    create: () =>
      fetch({
        url: `${args.host}${teamsUrl}`,
        method: "POST",
        body: mockTeam()
      })
  },
  services: {
    list: () => fetch({ url: `${args.host}${servicesUrl}` }),
    create: async () => {
      const mockData = await mockService();

      return fetch({
        url: `${args.host}${servicesUrl}`,
        method: "POST",
        body: mockData
      });
    }
  },
  integrations: {
    list: () => fetch({ url: `${args.host}${integrationsUrl}` }),
    createActions: async quantity => {
      const integrationsList = await opsgenie.integrations.list();

      if (integrationsList.data) {
        inquirer
          .prompt([
            {
              type: "list",
              message: "Please select an integration to add the actions",
              name: "selectedIntegration",
              choices: () =>
                integrationsList.data.reduce((acc, curr) => {
                  return [...acc, { name: curr.name, value: curr.id }];
                }, [])
            }
          ])
          .then(answers =>
            bulk(quantity, () =>
              fetch({
                url: `${args.host}${integrationsUrl}/${
                  answers.selectedIntegration
                }/actions`,
                method: "POST",
                body: mockIntegrationAction()
              })
            )
          ).finally(process.exit)
      }
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
  opsgenie.integrations.list().then(response => console.log(response));

  opsgenie.alerts.getAll().then(response => console.log(response));

  opsgenie.alerts.deleteAll();

  opsgenie.alerts.create().then(response => console.log(response));
  opsgenie.teams.create().then(response => console.log(response));
  opsgenie.services.create().then(response => console.log(response));
  opsgenie.integrations.createActions(100);

  bulk(26, opsgenie.alerts.create);
  bulk(40, opsgenie.teams.create);
  bulk(40, opsgenie.services.create);
*/
