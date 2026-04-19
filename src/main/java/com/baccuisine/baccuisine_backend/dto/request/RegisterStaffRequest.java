package com.baccuisine.baccuisine_backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterStaffRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be 3-50 characters")
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    // Profile Fields (with validation)
    @NotBlank(message = "Full name is required")
    @Size(max = 100, message = "Full name cannot exceed 100 characters")
    private String fullName;

    @Pattern(regexp = "^\\+?[0-9\\s\\-]{7,20}$", message = "Invalid phone number format")
    private String phone;

    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email cannot exceed 100 characters")
    private String email;

    @Size(max = 50, message = "Department name too long")
    private String department;

    //  Optional: Allow admin to specify role (validated in service layer)
    private String role;
}