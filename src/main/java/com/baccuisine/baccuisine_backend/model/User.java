package com.baccuisine.baccuisine_backend.model;

import com.baccuisine.baccuisine_backend.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // ============ Profile Fields ============

    @Column(length = 100)
    private String fullName;

    @Column(unique = true, length = 20)
    private String phone;

    @Column(unique = true, length = 100)
    private String email;

    @Column(length = 50)
    private String department; // e.g., "Kitchen", "Nursing", "Administration"

    // ============ Account Status Flags ============

    /**
     * Soft-delete flag: true = account is active, false = deactivated
     * Replaces approval workflow - staff are active immediately upon admin creation
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * Legacy approval flag - kept for backward compatibility
     * New registrations: default to true (no approval needed)
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean isApproved = true;

    /**
     * Security flag: force password change on next login
     * Useful for admin-created accounts with temporary passwords
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean forcePasswordChange = false;

    // ============ Audit Fields ============

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @Column(length = 50)
    private String createdBy; // e.g., "ADMIN", or username of creator

    // ============ JPA Lifecycle Callbacks ============

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ============ UserDetails Methods ============

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    /**
     * Spring Security uses this to determine if user can authenticate
     * Now checks 'active' flag (soft-delete) instead of approval status
     */
    @Override
    public boolean isEnabled() {
        return active;
    }

}