// src/main/java/com/baccuisine/baccuisine_backend/exception/BusinessException.java
package com.baccuisine.baccuisine_backend.exception;

/**
 * Custom exception for business rule violations
 */
public class BusinessException extends RuntimeException {

    private final String errorCode;
    private final Object[] args;

    public BusinessException(String message) {
        super(message);  //  Pass message to parent - enables getMessage()
        this.errorCode = "BUSINESS_ERROR";
        this.args = null;
    }

    public BusinessException(String message, String errorCode) {
        super(message);  //  Enables getMessage()
        this.errorCode = errorCode != null ? errorCode : "BUSINESS_ERROR";
        this.args = null;
    }

    public BusinessException(String message, String errorCode, Object... args) {
        super(message);  //  Enables getMessage()
        this.errorCode = errorCode != null ? errorCode : "BUSINESS_ERROR";
        this.args = args;
    }

    public BusinessException(String message, Throwable cause) {
        super(message, cause);  //  Enables getMessage()
        this.errorCode = "BUSINESS_ERROR";
        this.args = null;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public Object[] getArgs() {
        return args;
    }
}