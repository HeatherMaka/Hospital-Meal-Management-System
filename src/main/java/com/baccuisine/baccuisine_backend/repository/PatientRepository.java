package com.baccuisine.baccuisine_backend.repository;

import com.baccuisine.baccuisine_backend.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

    Optional<Patient> findByNin(String nin);

    /**
     * Find patient by login credentials: ward + bed + NIN
     */
    Optional<Patient> findByWardNumberAndBedNumberAndNin(
            String wardNumber,
            String bedNumber,
            String nin
    );

    boolean existsByWardNumberAndBedNumber(String wardNumber, String bedNumber);

    boolean existsByNin(String nin);

    long countByIsActiveTrue();
}