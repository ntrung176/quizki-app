async function run() {
    let url = `https://firestore.googleapis.com/v1/projects/quizki-988e9/databases/(default)/documents/artifacts/1:28989364918:web:a2a99ad33fc0c23fca6417/public/data/userStats?pageSize=100`;
    let count = 0;
    while (url) {
        console.log(`Fetching: ${url}`);
        const res = await fetch(url);
        const data = await res.json();
        if (data.documents) {
            for (const doc of data.documents) {
                count++;
                const name = doc.name.split('/').pop();
                const fields = doc.fields;
                const email = fields.email?.stringValue || '';
                const displayName = fields.displayName?.stringValue || '';
                if (email.includes('nhattrung') || displayName.includes('nhattrung')) {
                    console.log(`MATCHED USER:`);
                    console.log(`- ID: ${name}`);
                    console.log(`  Email: ${email}`);
                    console.log(`  DisplayName: ${displayName}`);
                    console.log(`  IsPremium: ${fields.isPremium?.booleanValue}`);
                    console.log(`  unlockedPackages: ${JSON.stringify(fields.unlockedSpecializedPackages?.arrayValue?.values?.map(v => v.stringValue))}`);
                    if (fields.premiumExpiresAt) {
                        const expVal = fields.premiumExpiresAt.integerValue || fields.premiumExpiresAt.doubleValue || fields.premiumExpiresAt.stringValue;
                        console.log(`  premiumExpiresAt: ${expVal} (${new Date(Number(expVal)).toLocaleString()})`);
                    }
                }
            }
        }
        if (data.nextPageToken) {
            url = `https://firestore.googleapis.com/v1/projects/quizki-988e9/databases/(default)/documents/artifacts/1:28989364918:web:a2a99ad33fc0c23fca6417/public/data/userStats?pageSize=100&pageToken=${data.nextPageToken}`;
        } else {
            url = null;
        }
    }
    console.log(`Total documents scanned: ${count}`);
}

run();
