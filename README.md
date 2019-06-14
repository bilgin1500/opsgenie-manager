# Opsgenie manager

A basic wrapper around the [OpsGenie Rest API V2](https://docs.opsgenie.com/docs/api-overview). It allows you to bulk update any given instance via CLI.

Examples:
```
node opsgenie create 12 alerts
node opsgenie delete all teams
node opsgenie get alert 23
node opsgenie list alerts
```

Note that  `--apikey` and `--host` should be appended to all the commands and that some of the actions cannot be done with an integrations based API key. (For example to see the list of all the teams you should use a general API key.)

For detailed help please use `node opsgenie --help`