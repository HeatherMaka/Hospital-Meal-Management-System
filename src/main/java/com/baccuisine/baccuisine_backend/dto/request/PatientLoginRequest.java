package com.baccuisine.baccuisine_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientLoginRequest {

    @NotBlank(message = "Ward number is required")
    private String wardNumber;

    @NotBlank(message = "Bed number is required")
    private String bedNumber;

    @NotBlank(message = "NIN is required")
    private String nin;
}