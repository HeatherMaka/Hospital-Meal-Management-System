// src/main/java/com/baccuisine/baccuisine_backend/exception/AccessDeniedException.java
package com.baccuisine.baccuisine_backend.exception;

/**
 * Custom exception for authorization failures
 */
public class AccessDeniedException extends RuntimeException {

    private final String requiredRole;
    private final String actualRole;

    public AccessDeniedException(String message) {
        super(message);  //  Enables getMessage()
        this.requiredRole = null;
        this.actualRole = null;
    }

    public AccessDeniedException(String message, String requiredRole, String actualRole) {
        super(message);  //  Enables getMessage()
        this.requiredRole = requiredRole;
        this.actualRole = actualRole;
    }

    public String getRequiredRole() {
        return requiredRole;
    }

    public String getActualRole() {
        return actualRole;
    }
}