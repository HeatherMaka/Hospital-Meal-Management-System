package com.baccuisine.baccuisine_backend.repository;

import com.baccuisine.baccuisine_backend.model.User;
import com.baccuisine.baccuisine_backend.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    List<User> findByRoleAndIsApproved(Role role, boolean isApproved);

    List<User> findByRole(Role role);

    boolean existsByPhone(String phone);

    List<User> findByRoleInAndActive(List<Role> staff, boolean b);
}