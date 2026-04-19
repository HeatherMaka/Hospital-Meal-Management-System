// src/main/java/com/baccuisine/baccuisine_backend/dto/response/ErrorResponse.java
package com.baccuisine.baccuisine_backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {
    private int status;
    private String error;
    private String message;
    private LocalDateTime timestamp;
    private String path;          // Optional: request path
    private String errorCode;     // Optional: business error code
}