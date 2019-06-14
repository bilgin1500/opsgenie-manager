var faker = require("faker");

const alert = () => {
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

const team = () => {
  return {
    name: faker.random.word(),
    description: faker.lorem.sentence()
  };
};

module.exports = {
  alert,
  team
};
