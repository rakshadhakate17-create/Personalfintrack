
package com.personalfinance.tracker.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.personalfinance.tracker.dto.TransactionRequest;
import com.personalfinance.tracker.entity.Transaction;
import com.personalfinance.tracker.service.TransactionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/transactions")
@Validated
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(
            TransactionService transactionService) {

        this.transactionService = transactionService;
    }

    // POST /api/transactions
    // Add income or expense.
    @PostMapping
    public ResponseEntity<Transaction> addTransaction(
            @Valid @RequestBody TransactionRequest request,
            Authentication authentication) {

        Transaction savedTransaction =
                transactionService.addTransaction(
                        request,
                        authentication
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedTransaction);
    }

    // GET /api/transactions
    // View the logged-in user's transactions.
    @GetMapping
    public ResponseEntity<List<Transaction>> getMyTransactions(
            Authentication authentication) {

        List<Transaction> transactions =
                transactionService.getMyTransactions(
                        authentication
                );

        return ResponseEntity.ok(transactions);
    }

    // DELETE /api/transactions/{id}
    // Delete a transaction owned by the logged-in user.
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(
            @PathVariable("id") String transactionId,
            Authentication authentication) {

        transactionService.deleteTransaction(
                transactionId,
                authentication
        );

        return ResponseEntity.noContent().build();
    }

    // PUT /api/transactions/{id}
    // Update a transaction owned by the logged-in user.
    @PutMapping("/{id}")
    public ResponseEntity<Transaction> updateTransaction(
            @PathVariable("id") String transactionId,
            @Valid @RequestBody TransactionRequest request,
            Authentication authentication) {

        Transaction updatedTransaction =
                transactionService.updateTransaction(
                        transactionId,
                        request,
                        authentication
                );

        return ResponseEntity.ok(updatedTransaction);
    }

}
