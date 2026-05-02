package com.baccuisine.baccuisine_backend.config;

import com.baccuisine.baccuisine_backend.enums.Role;
import com.baccuisine.baccuisine_backend.model.User;
import com.baccuisine.baccuisine_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    CommandLineRunner initDatabase() {
        return args -> {
            // ============ CREATE OR UPDATE ADMIN ACCOUNT ============
            var existingAdmin = userRepository.findByUsername("admin");
            
            if (existingAdmin.isPresent()) {
                // Update password to ensure it's correct
                User admin = existingAdmin.get();
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setActive(true);
                admin.setApproved(true);
                userRepository.save(admin);
                System.out.println(" ==========================================");
                System.out.println(" ADMIN ACCOUNT UPDATED");
                System.out.println(" Username: admin");
                System.out.println(" Password: admin123");
                System.out.println(" ==========================================");
            } else {
                // Create new admin account
                User admin = User.builder()
                        .username("admin")
                        .password(passwordEncoder.encode("admin123"))
                        .role(Role.ADMIN)
                        .isApproved(true)
                        .active(true)
                        .build();
                userRepository.save(admin);
                System.out.println(" ==========================================");
                System.out.println(" DEFAULT ADMIN ACCOUNT CREATED");
                System.out.println(" Username: admin");
                System.out.println(" Password: admin123");
                System.out.println(" ==========================================");
            }
        };
    }
}
