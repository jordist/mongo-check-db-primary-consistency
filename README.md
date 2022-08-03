Reconciles the metadata in `config.databases` with the entries on `config.changelog` to spot inconsistencies in the `dbPrimary` information.

`mongosh --port <mongos port> --file check-dbPrimary-consistency.js`
