package com.baccuisine.baccuisine_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Example: Serve static files if needed (though React handles this)
        // registry.addResourceHandler("/uploads/**")
        //         .addResourceLocations("file:uploads/");
    }

    @Override
    public void addViewControllers(org.springframework.web.servlet.config.annotation.ViewControllerRegistry registry) {
        // Example: Forward root to index.html if serving frontend from backend
        // registry.addViewController("/").setViewName("forward:/index.html");
    }
}