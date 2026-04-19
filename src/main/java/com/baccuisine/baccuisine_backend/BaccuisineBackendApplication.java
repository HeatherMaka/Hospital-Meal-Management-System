package com.baccuisine.baccuisine_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
public class BaccuisineBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BaccuisineBackendApplication.class, args);
	}
}

