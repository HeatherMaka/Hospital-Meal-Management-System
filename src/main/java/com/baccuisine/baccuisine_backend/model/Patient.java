package com.baccuisine.baccuisine_backend.model;

import com.baccuisine.baccuisine_backend.enums.DietaryType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

@Entity
@Table(name = "patients")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patient implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String wardNumber;

    @Column(nullable = false)
    private String bedNumber;

    @Column(unique = true, nullable = false)
    private String nin; // National Identity Number

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String surname;

    private Integer age;

    private String gender;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DietaryType dietaryType = DietaryType.NORMAL;

    @Column(nullable = false)
    private boolean isActive = true; // Soft delete: false = discharged

    // ============ UserDetails Methods ============

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Patients have ROLE_PATIENT authority
        return Collections.singletonList(new SimpleGrantedAuthority("ROLE_PATIENT"));
    }

    @Override
    public String getPassword() {
        // Patients don't authenticate with password - they use ward/bed/nin
        return "";
    }

    @Override
    public String getUsername() {
        // Unique identifier for patient: ward-bed-nin
        return wardNumber + "-" + bedNumber + "-" + nin;
    }

    @Override
    public boolean isAccountNonExpired() {
        // Patient account is valid while active
        return isActive;
    }

    @Override
    public boolean isAccountNonLocked() {
        // Patients are never locked (no brute force protection needed)
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        // Patient credentials (ward/bed/nin) don't expire
        return true;
    }

    @Override
    public boolean isEnabled() {
        // Only active patients can login
        return isActive;
    }

    // ============ Helper Methods ============

    /**
     * Patient login identifier: wardNumber + bedNumber + nin
     */
    public String getLoginIdentifier() {
        return wardNumber + "-" + bedNumber + "-" + nin;
    }

    /**
     * Get full name (convenience method for frontend)
     */
    public String getFullName() {
        return name + " " + surname;
    }

    public void setRole(String role) {
    }
}