package com.baccuisine.baccuisine_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import lombok.extern.slf4j.Slf4j;

@SpringBootApplication
@EnableJpaAuditing
@Slf4j
public class BaccuisineBackendApplication {

	public static void main(String[] args) {
		try {
			SpringApplication.run(BaccuisineBackendApplication.class, args);
			log.info("╔════════════════════════════════════════════════════════════════╗");
			log.info("║  Bac Cuisine Backend Application - Started Successfully      ║");
			log.info("║  Server running on: http://localhost:8080                    ║");
			log.info("║  Swagger UI: http://localhost:8080/swagger-ui.html          ║");
			log.info("╚════════════════════════════════════════════════════════════════╝");
		} catch (Exception e) {
			log.error("❌ FAILED TO START APPLICATION:", e);
			log.error("Error: {}", e.getMessage());
			e.printStackTrace();
			System.exit(1);
		}
	}
}

