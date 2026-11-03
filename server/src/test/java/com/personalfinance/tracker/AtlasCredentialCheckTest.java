package com.personalfinance.tracker;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.bson.Document;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AtlasCredentialCheckTest {

    @Test
    void verifyAtlasCredentials() {

        String username = System.getenv("MONGODB_USERNAME");
        String password = System.getenv("MONGODB_PASSWORD");

        if (username == null || password == null) {
            throw new IllegalStateException(
                "MongoDB environment variables are missing"
            );
        }

        String uri = "mongodb+srv://" + username + ":" + password
            + "@financetracker.4sdeltx.mongodb.net/"
            + "personal_finance_tracker"
            + "?retryWrites=true&w=majority"
            + "&authSource=admin"
            + "&authMechanism=SCRAM-SHA-256";

        try (MongoClient client = MongoClients.create(uri)) {
            Document result = client.getDatabase("admin")
                .runCommand(new Document("ping", 1));

            System.out.println("ATLAS TEST RESULT: " + result);

            assertEquals(1.0, ((Number) result.get("ok")).doubleValue());
        }
    }
}