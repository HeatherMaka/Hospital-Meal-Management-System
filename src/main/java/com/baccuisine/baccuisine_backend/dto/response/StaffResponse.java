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
public class StaffResponse {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String department;
    private Role role;
    private boolean active;
    private boolean forcePasswordChange;
    private String createdAt;
    private String updatedAt;
}