// src/main/java/com/baccuisine/baccuisine_backend/exception/ValidationException.java
package com.baccuisine.baccuisine_backend.exception;

import java.util.Map;

/**
 *  Custom exception for validation errors
 * Example: "Invalid phone format", "Password too short"
 */
public class ValidationException extends RuntimeException {

    private final Map<String, String> fieldErrors;

    public ValidationException(String message) {
        super(message);
        this.fieldErrors = null;
    }

    public ValidationException(String message, Map<String, String> fieldErrors) {
        super(message);
        this.fieldErrors = fieldErrors;
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}