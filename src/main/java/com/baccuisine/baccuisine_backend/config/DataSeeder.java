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
            // ============ CREATE ADMIN ACCOUNT ONLY ============
            if (userRepository.findByUsername("admin").isEmpty()) {
                User admin = User.builder()
                        .username("admin")
                        .password(passwordEncoder.encode("admin123"))
                        .role(Role.ADMIN)
                        .isApproved(true)
                        .build();

                userRepository.save(admin);
                System.out.println(" ============================================");
                System.out.println(" DEFAULT ADMIN ACCOUNT CREATED");
                System.out.println(" Username: admin");
                System.out.println(" Password: admin123");
                System.out.println(" ============================================");
            } else {
                System.out.println(" Admin account already exists");
            }
        };
    }
}