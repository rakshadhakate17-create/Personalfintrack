
package com.personalfinance.tracker.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.personalfinance.tracker.dto.BudgetRequest;
import com.personalfinance.tracker.dto.BudgetResponse;
import com.personalfinance.tracker.service.BudgetService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/budgets")
@Validated
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @GetMapping
    public ResponseEntity<List<BudgetResponse>> getMyBudgets(
            Authentication authentication) {

        return ResponseEntity.ok(
                budgetService.getMyBudgets(authentication));
    }

    @PostMapping
    public ResponseEntity<BudgetResponse> saveBudget(
            @Valid @RequestBody BudgetRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(
                budgetService.saveBudget(request, authentication));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBudget(
            @PathVariable("id") String budgetId,
            Authentication authentication) {

        budgetService.deleteBudget(budgetId, authentication);

        return ResponseEntity.noContent().build();
    }
}
