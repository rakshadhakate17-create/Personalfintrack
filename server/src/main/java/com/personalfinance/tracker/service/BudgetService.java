
package com.personalfinance.tracker.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.personalfinance.tracker.dto.BudgetRequest;
import com.personalfinance.tracker.dto.BudgetResponse;
import com.personalfinance.tracker.entity.Budget;
import com.personalfinance.tracker.entity.Transaction;
import com.personalfinance.tracker.entity.User;
import com.personalfinance.tracker.repository.BudgetRepository;
import com.personalfinance.tracker.repository.TransactionRepository;
import com.personalfinance.tracker.repository.UserRepository;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public BudgetService(
            BudgetRepository budgetRepository,
            TransactionRepository transactionRepository,
            UserRepository userRepository) {

        this.budgetRepository = budgetRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser(Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required");
        }

        String email = authentication.getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"));
    }

    public List<BudgetResponse> getMyBudgets(
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        return budgetRepository
                .findByUserIdOrderByYearDescMonthDesc(user.getId())
                .stream()
                .map(budget -> toResponse(budget, user.getId()))
                .toList();
    }

    // Creates a budget or updates the existing budget
    // for the same user, month, year, and category.
    public BudgetResponse saveBudget(
            BudgetRequest request,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        String category = request.getCategory().trim();

        if ("ALL".equalsIgnoreCase(category)) {
            category = "ALL";
        }

        Budget budget = budgetRepository
                .findByUserIdAndYearAndMonthAndCategory(
                        user.getId(),
                        request.getYear(),
                        request.getMonth(),
                        category)
                .orElseGet(Budget::new);

        Instant now = Instant.now();

        if (budget.getId() == null) {
            budget.setUserId(user.getId());
            budget.setCreatedAt(now);
        }

        budget.setYear(request.getYear());
        budget.setMonth(request.getMonth());
        budget.setCategory(category);
        budget.setAmount(request.getAmount());
        budget.setUpdatedAt(now);

        Budget saved = budgetRepository.save(budget);

        return toResponse(saved, user.getId());
    }

    public void deleteBudget(
            String budgetId,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Budget budget = budgetRepository
                .findByIdAndUserId(budgetId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Budget not found"));

        budgetRepository.delete(budget);
    }

    private BudgetResponse toResponse(Budget budget, String userId) {

        BigDecimal spent = calculateSpent(budget, userId);
        BigDecimal limit = budget.getAmount();

        BigDecimal remaining = limit.subtract(spent);

        BigDecimal percentageUsed = spent
                .multiply(BigDecimal.valueOf(100))
                .divide(limit, 2, RoundingMode.HALF_UP);

        boolean overBudget = spent.compareTo(limit) > 0;

        return new BudgetResponse(
                budget.getId(),
                budget.getYear(),
                budget.getMonth(),
                budget.getCategory(),
                limit,
                spent,
                remaining,
                percentageUsed,
                overBudget);
    }

    private BigDecimal calculateSpent(Budget budget, String userId) {

        LocalDate firstDay = LocalDate.of(
                budget.getYear(),
                budget.getMonth(),
                1);

        LocalDate lastDay = firstDay
                .withDayOfMonth(firstDay.lengthOfMonth());

        List<Transaction> transactions =
                transactionRepository
                        .findByUserIdOrderByTransactionDateDesc(userId);

        BigDecimal total = BigDecimal.ZERO;

        for (Transaction transaction : transactions) {

            if (!"EXPENSE".equals(transaction.getType())) {
                continue;
            }

            LocalDate date = transaction.getTransactionDate();

            if (date == null
                    || date.isBefore(firstDay)
                    || date.isAfter(lastDay)) {
                continue;
            }

            boolean isOverallBudget =
                    "ALL".equalsIgnoreCase(budget.getCategory());

            if (!isOverallBudget
                    && !budget.getCategory().equalsIgnoreCase(
                            transaction.getCategory())) {
                continue;
            }

            if (transaction.getAmount() != null) {
                total = total.add(transaction.getAmount());
            }
        }

        return total;
    }
}
