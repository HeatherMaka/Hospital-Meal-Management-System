// src/main/java/com/baccuisine/baccuisine_backend/exception/DuplicateResourceException.java
package com.baccuisine.baccuisine_backend.exception;

public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }

    public DuplicateResourceException(String message, Throwable cause) {
        super(message, cause);
    }
}