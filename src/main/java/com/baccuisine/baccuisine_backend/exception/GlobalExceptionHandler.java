// src/main/java/com/baccuisine/baccuisine_backend/exception/GlobalExceptionHandler.java
package com.baccuisine.baccuisine_backend.exception;

import com.baccuisine.baccuisine_backend.dto.response.ErrorResponse;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.security.SignatureException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // ============ RUNTIME & BUSINESS ERRORS ============

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex) {
        log.warn("Runtime exception: {}", ex.getMessage(), ex);

        ErrorResponse error = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Bad Request")
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> handleBusinessException(BusinessException ex) {
        log.warn(" Business rule violation: {} [code:{}]",
                ex.getMessage(),
                ex.getErrorCode() != null ? ex.getErrorCode() : "BUSINESS_ERROR");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", 400);
        body.put("error", "Bad Request");
        body.put("message", ex.getMessage());

        if (ex.getErrorCode() != null) {
            body.put("errorCode", ex.getErrorCode());
        }
        if (ex.getArgs() != null && ex.getArgs().length > 0) {
            body.put("args", ex.getArgs());
        }

        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(ResourceNotFoundException ex) {
        log.warn(" Resource not found: {}", ex.getMessage());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", 404);
        body.put("error", "Not Found");
        body.put("message", ex.getMessage());

        if (ex.getResourceName() != null) {
            body.put("resource", ex.getResourceName());
        }
        if (ex.getFieldName() != null) {
            body.put("field", ex.getFieldName());
            body.put("value", ex.getFieldValue());
        }

        return ResponseEntity.status(404).body(body);
    }

    // ============ AUTHENTICATION & AUTHORIZATION ============

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        log.warn(" Authentication failed: Invalid credentials");

        ErrorResponse error = ErrorResponse.builder()
                .status(HttpStatus.UNAUTHORIZED.value())
                .error("Unauthorized")
                .message("Invalid username or password")
                .timestamp(LocalDateTime.now())
                .build();
        return new ResponseEntity<>(error, HttpStatus.UNAUTHORIZED);
    }

    // Use standard Spring Security AccessDeniedException
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        log.warn(" Access denied: {}", ex.getMessage());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", 403);
        body.put("error", "Forbidden");
        body.put("message", "Access denied. Insufficient privileges.");

        return ResponseEntity.status(403).body(body);
    }

    // Use custom AccessDeniedException with proper getMessage()
    @ExceptionHandler(com.baccuisine.baccuisine_backend.exception.AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleCustomAccessDenied(
            com.baccuisine.baccuisine_backend.exception.AccessDeniedException ex) {
        log.warn("Custom access denied: {} (required: {}, actual: {})",
                ex.getMessage(),
                ex.getRequiredRole(),
                ex.getActualRole());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", 403);
        body.put("error", "Forbidden");
        body.put("message", ex.getMessage());
        body.put("requiredRole", ex.getRequiredRole());
        body.put("actualRole", ex.getActualRole());

        return ResponseEntity.status(403).body(body);
    }

    // ============ JWT ERRORS ============

    @ExceptionHandler(SignatureException.class)
    public ResponseEntity<Map<String, Object>> handleJwtSignatureError(SignatureException ex) {
        log.error(" JWT signature verification failed: {}", ex.getMessage());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", 401);
        body.put("error", "Unauthorized");
        body.put("message", "Invalid authentication token");
        body.put("errorDetail", "Token signature mismatch");

        return ResponseEntity.status(401).body(body);
    }

    @ExceptionHandler(ExpiredJwtException.class)
    public ResponseEntity<Map<String, Object>> handleJwtExpired(ExpiredJwtException ex) {
        log.warn(" JWT token expired: {}", ex.getMessage());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", 401);
        body.put("error", "Unauthorized");
        body.put("message", "Authentication token has expired");
        body.put("errorDetail", "Token expired");
        if (ex.getClaims() != null && ex.getClaims().getExpiration() != null) {
            body.put("expiredAt", ex.getClaims().getExpiration());
        }

        return ResponseEntity.status(401).body(body);
    }

    // ============ VALIDATION ERRORS ============

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(
            MethodArgumentNotValidException ex) {
        log.debug(" Validation failed: {} errors", ex.getErrorCount());

        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            fieldErrors.put(fieldName, errorMessage);
        });

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", "Validation failed: " + String.join("; ", fieldErrors.values()));
        body.put("fieldErrors", fieldErrors);
        body.put("status", 400);
        body.put("error", "Bad Request");

        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    // ============ GENERIC ERRORS ============

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn(" Invalid argument: {}", ex.getMessage());

        ErrorResponse error = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Bad Request")
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        //  Log full stack trace for unexpected errors
        log.error(" Unexpected error occurred", ex);

        ErrorResponse error = ErrorResponse.builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("Internal Server Error")
                .message("An unexpected error occurred. Please try again later.")
                .timestamp(LocalDateTime.now())
                .build();
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}