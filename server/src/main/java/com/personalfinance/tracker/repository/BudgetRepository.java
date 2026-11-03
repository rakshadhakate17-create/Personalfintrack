
package com.personalfinance.tracker.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.personalfinance.tracker.entity.Budget;

public interface BudgetRepository extends MongoRepository<Budget, String> {

    List<Budget> findByUserIdOrderByYearDescMonthDesc(String userId);

    Optional<Budget> findByUserIdAndYearAndMonthAndCategory(
        String userId,
        Integer year,
        Integer month,
        String category
    );

    Optional<Budget> findByIdAndUserId(String id, String userId);
}
