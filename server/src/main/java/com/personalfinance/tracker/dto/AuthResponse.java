
package com.personalfinance.tracker.dto;

public class AuthResponse {

    private String token;
    private String tokenType = "Bearer";
    private String userId;
    private String fullName;
    private String email;

    public AuthResponse() {
    }

    public AuthResponse(
            String token,
            String userId,
            String fullName,
            String email) {

        this.token = token;
        this.userId = userId;
        this.fullName = fullName;
        this.email = email;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public String getUserId() {
        return userId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }
}
