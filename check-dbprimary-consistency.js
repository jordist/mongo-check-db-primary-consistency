function checkDbConsistency(dbEntry) {
    const dbName = dbEntry._id;

    // Traverse the changelog related to this db, from newest to oldest.
    var configChangelogCursor = configDb.changelog.find({ns: dbName}).sort({time: -1});

    while (configChangelogCursor.hasNext()) {
        const changelogEntry = configChangelogCursor.next();

        if (changelogEntry.what === 'movePrimary.commit') {
            configChangelogCursor.close();
            if (changelogEntry.details.to === dbEntry.primary) {
                return {
                    db: dbName, status: "Consistent (conclusive)",
                        detail: "Consistent after latest movePrimary operation"
                }
            } else {
                return {
                    db: dbName,
                    status: "Inconsistency detected",
                    detail:
                        {expectedPrimary: changelogEntry.details.to, actualPrimary: dbEntry.primary}
                };
            }
        }

        if (changelogEntry.what === 'movePrimary.start') {
            // We know that a movePrimary started, but we don't know if it committed or not.
            configChangelogCursor.close();
            return {
                db: dbName,
                status: "Inconclusive",
                detail:
                    "Observed 'movePrimary.start', but no 'movePrimary.commit'. Cannot conclude if the movePrimary operation committed or not."
            };
        }

        if (changelogEntry.what === 'dropDatabase' ||
            changelogEntry.what === 'dropDatabase.start') {
            // No dbPrimary happened since the last time the db was possibly created. Therefore,
            // there cannot be any inconsistency due to movePrimary.
            configChangelogCursor.close();
            return {
                db: dbName,
                status: "Consistent (conclusive)",
                detail: "Consistent after latest dropDatabase operation"
            };
        }
    }

    // No relevant changelog entry found, therefore we cannot conclusively know if there is an
    // inconsistency.
    return {
        db: dbName,
        status: "No inconsistency detected (inconclusive)",
        detail: "No relevant changelog entry found."
    };
}

const configDb = db.getSiblingDB('config');

var results = [];
var configDatabasesCursor = configDb.databases.find();
while (configDatabasesCursor.hasNext()) {
    const dbEntry = configDatabasesCursor.next();
    results.push(checkDbConsistency(dbEntry));
}

printjson(results);
