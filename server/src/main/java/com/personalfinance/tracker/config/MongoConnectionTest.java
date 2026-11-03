package com.personalfinance.tracker.config;

import org.bson.Document;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

@Component
public class MongoConnectionTest implements CommandLineRunner {

    private final MongoTemplate mongoTemplate;

    public MongoConnectionTest(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            Document result = mongoTemplate.executeCommand(
                    new Document("ping", 1)
            );

            Number ok = (Number) result.get("ok");

            if (ok != null && ok.doubleValue() == 1.0) {
                System.out.println("MongoDB Atlas connection successful!");
            } else {
                System.err.println("MongoDB Atlas ping returned: " + result);
            }

        } catch (Exception e) {
            System.err.println(
                    "MongoDB Atlas connection failed: " + e.getMessage()
            );
        }
    }
}