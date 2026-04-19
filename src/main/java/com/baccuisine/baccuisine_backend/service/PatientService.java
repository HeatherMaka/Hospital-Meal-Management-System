package com.baccuisine.baccuisine_backend.service;

import com.baccuisine.baccuisine_backend.dto.request.PatientRegisterRequest;
import com.baccuisine.baccuisine_backend.model.Patient;
import com.baccuisine.baccuisine_backend.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;

    /**
     * Register new patient (Admin only)
     */
    public Patient registerPatient(PatientRegisterRequest request) {
        // Check if ward+bed combination already exists for active patient
        if (patientRepository.existsByWardNumberAndBedNumber(
                request.getWardNumber(),
                request.getBedNumber())) {
            throw new RuntimeException("Ward and Bed number already assigned to an active patient");
        }

        // Check if NIN already exists
        if (patientRepository.existsByNin(request.getNin())) {
            throw new RuntimeException("NIN already registered");
        }

        Patient patient = Patient.builder()
                .wardNumber(request.getWardNumber())
                .bedNumber(request.getBedNumber())
                .nin(request.getNin())
                .name(request.getName())
                .surname(request.getSurname())
                .age(request.getAge())
                .gender(request.getGender())
                .dietaryType(request.getDietaryType())
                .isActive(true)
                .build();

        return patientRepository.save(patient);
    }

    /**
     * Get all active patients
     */
    public List<Patient> getAllActivePatients() {
        return patientRepository.findAll().stream()
                .filter(Patient::isActive)
                .toList();
    }

    /**
     * Get patient by ID
     */
    public Patient getPatientById(Long id) {
        return patientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Patient not found"));
    }

    /**
     * Update patient details
     */
    public Patient updatePatient(Long id, PatientRegisterRequest request) {
        Patient patient = getPatientById(id);

        patient.setWardNumber(request.getWardNumber());
        patient.setBedNumber(request.getBedNumber());
        patient.setName(request.getName());
        patient.setSurname(request.getSurname());
        patient.setAge(request.getAge());
        patient.setGender(request.getGender());
        patient.setDietaryType(request.getDietaryType());

        return patientRepository.save(patient);
    }

    /**
     * Discharge patient (soft delete)
     */
    public Patient dischargePatient(Long id) {
        Patient patient = getPatientById(id);
        patient.setActive(false);
        return patientRepository.save(patient);
    }

    /**
     * Get patient count for analytics
     */
    public long getActivePatientCount() {
        return patientRepository.countByIsActiveTrue();
    }
}