package com.baccuisine.baccuisine_backend.dto.request;

import com.baccuisine.baccuisine_backend.enums.DietaryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientRegisterRequest {

    @NotBlank(message = "Ward number is required")
    private String wardNumber;

    @NotBlank(message = "Bed number is required")
    private String bedNumber;

    @NotBlank(message = "NIN is required")
    private String nin;

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Surname is required")
    private String surname;

    private Integer age;

    private String gender;

    @NotNull(message = "Dietary type is required")
    private DietaryType dietaryType;
}