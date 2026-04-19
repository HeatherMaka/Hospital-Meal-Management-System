// src/main/java/com/baccuisine/baccuisine_backend/dto/response/AuthResponse.java
package com.baccuisine.baccuisine_backend.dto.response;

import com.baccuisine.baccuisine_backend.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private Role role;
    private Long userId;              // ADD THIS FIELD
    private String username;          // ADD THIS FIELD (optional but useful)
    private String message;

    // Patient-specific fields (keep if using patient login)
    private Long patientId;
    private String wardNumber;
    private String bedNumber;
    private String name;

    // ADD THIS for force password change flow
    @Builder.Default
    private boolean forcePasswordChange = false;
}