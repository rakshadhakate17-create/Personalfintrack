
package com.personalfinance.tracker.dto;

import java.math.BigDecimal;

public class BudgetResponse {

    private String id;
    private Integer year;
    private Integer month;
    private String category;
    private BigDecimal amount;
    private BigDecimal spent;
    private BigDecimal remaining;
    private BigDecimal percentageUsed;
    private boolean overBudget;

    public BudgetResponse(
            String id,
            Integer year,
            Integer month,
            String category,
            BigDecimal amount,
            BigDecimal spent,
            BigDecimal remaining,
            BigDecimal percentageUsed,
            boolean overBudget) {

        this.id = id;
        this.year = year;
        this.month = month;
        this.category = category;
        this.amount = amount;
        this.spent = spent;
        this.remaining = remaining;
        this.percentageUsed = percentageUsed;
        this.overBudget = overBudget;
    }

    public String getId() {
        return id;
    }

    public Integer getYear() {
        return year;
    }

    public Integer getMonth() {
        return month;
    }

    public String getCategory() {
        return category;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public BigDecimal getSpent() {
        return spent;
    }

    public BigDecimal getRemaining() {
        return remaining;
    }

    public BigDecimal getPercentageUsed() {
        return percentageUsed;
    }

    public boolean isOverBudget() {
        return overBudget;
    }
}
