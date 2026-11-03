
package com.personalfinance.tracker.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.personalfinance.tracker.dto.TransactionRequest;
import com.personalfinance.tracker.entity.Transaction;
import com.personalfinance.tracker.entity.User;
import com.personalfinance.tracker.repository.TransactionRepository;
import com.personalfinance.tracker.repository.UserRepository;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public TransactionService(
            TransactionRepository transactionRepository,
            UserRepository userRepository) {

        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    // Find the authenticated user using the email
    // placed in SecurityContext by JwtAuthenticationFilter.
    private User getCurrentUser(Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        String email = authentication.getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                ));
    }

    // POST: Add income or expense.
    public Transaction addTransaction(
            TransactionRequest request,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Transaction transaction = new Transaction(
                user.getId(),
                request.getType(),
                request.getCategory().trim(),
                request.getAmount(),
                request.getDescription(),
                request.getTransactionDate()
        );

        return transactionRepository.save(transaction);
    }

    // GET: Retrieve only the logged-in user's transactions.
    public List<Transaction> getMyTransactions(
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        return transactionRepository
                .findByUserIdOrderByTransactionDateDesc(
                        user.getId()
                );
    }

    // DELETE: Delete only a transaction owned by this user.
    public void deleteTransaction(
            String transactionId,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Transaction transaction = transactionRepository
                .findByIdAndUserId(transactionId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Transaction not found"
                ));

        transactionRepository.delete(transaction);
    }

    // PUT: Update only a transaction owned by the logged-in user.
    public Transaction updateTransaction(
            String transactionId,
            TransactionRequest request,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Transaction transaction = transactionRepository
                .findByIdAndUserId(transactionId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Transaction not found"
                ));

        transaction.setType(request.getType());
        transaction.setCategory(request.getCategory().trim());
        transaction.setAmount(request.getAmount());
        transaction.setDescription(request.getDescription());
        transaction.setTransactionDate(request.getTransactionDate());

        return transactionRepository.save(transaction);
    }

}
