const opsgenie = require("opsgenie-sdk");
const totalAlerts = Number(process.argv[2]);

if (
  totalAlerts === undefined ||
  totalAlerts === null ||
  totalAlerts === 0 ||
  isNaN(totalAlerts)
) {
  console.log(
    "How many alerts should I create? You can pass it as a number argument, i.e. `node createAlerts 40`"
  );
  process.exit(1);
}

opsgenie.configure({
  host: "https://bozkan-api.opsgeni.us/",
  api_key: "6e2e1a46-494e-4919-a111-3da01dea68f2" // Integration API key
});

const team1 = [
  { name: "team1" },
  { id: "07a87b35-ea91-4e7f-8e3c-2f040e46da9c" }
];

const generateMockAlertData = uid => {
  return {
    message: `Alert message ${uid}`,
    alias: `Alert alias ${uid}`,
    description:
      "Nulla pulvinar sem ut dui hendrerit efficitur. Curabitur ultrices metus velit, ut tempor libero semper sit amet. Sed id fringilla orci.",
    teams: team1,
    visibleTo: [
      {
        name: "team1",
        type: "team"
      },
      {
        username: "bozkan+root@opsgenie.com",
        type: "user"
      }
    ],
    actions: ["newCustomAction", "anotherNewCustomAction"],
    tags: ["tag1", "tag2"],
    details: {
      key1: "value1",
      key2: "value2"
    },
    entity: "Some important server",
    priority: "P1"
  };
};

createAlert = uid => {
  return new Promise(resolve => {
    opsgenie.alertV2.create(generateMockAlertData(uid), (error, alert) => {
      if (error) {
        reject(error);
      } else {
        resolve(alert);
      }
    });
  });
};

(async () => {
  for (let i = 0; i < totalAlerts; i++) {
    const currAlert = i + 1; // bypass 0
    await createAlert(currAlert);
    console.log("Created alert", currAlert);
  }

  console.log(`${totalAlerts} alerts have been created.`);
})();
