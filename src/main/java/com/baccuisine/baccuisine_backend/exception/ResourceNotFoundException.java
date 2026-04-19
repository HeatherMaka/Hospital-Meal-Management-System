// src/main/java/com/baccuisine/baccuisine_backend/exception/ResourceNotFoundException.java
package com.baccuisine.baccuisine_backend.exception;

/**
 * Custom exception for resources that don't exist
 */
public class ResourceNotFoundException extends RuntimeException {

    private final String resourceName;
    private final String fieldName;
    private final Object fieldValue;

    public ResourceNotFoundException(String message) {
        super(message);  //  Enables getMessage()
        this.resourceName = null;
        this.fieldName = null;
        this.fieldValue = null;
    }

    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s not found with %s: '%s'", resourceName, fieldName, fieldValue));  // Enables getMessage()
        this.resourceName = resourceName;
        this.fieldName = fieldName;
        this.fieldValue = fieldValue;
    }

    public String getResourceName() {
        return resourceName;
    }

    public String getFieldName() {
        return fieldName;
    }

    public Object getFieldValue() {
        return fieldValue;
    }
}