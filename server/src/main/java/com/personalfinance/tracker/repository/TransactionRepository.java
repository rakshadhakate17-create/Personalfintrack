
package com.personalfinance.tracker.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.personalfinance.tracker.entity.Transaction;

public interface TransactionRepository
        extends MongoRepository<Transaction, String> {

    // Retrieve transactions belonging to a user,
    // newest transaction date first.
    List<Transaction> findByUserIdOrderByTransactionDateDesc(
            String userId
    );

    // Find a specific transaction only if
    // it belongs to the given user.
    Optional<Transaction> findByIdAndUserId(
            String id,
            String userId
    );
}
