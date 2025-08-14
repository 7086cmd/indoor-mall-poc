#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_timer.h"
#include "esp_log.h"

// Pin definitions
#define TRIG_PIN GPIO_NUM_18
#define ECHO_PIN GPIO_NUM_19

static const char* TAG = "ULTRASONIC";

// Initialize GPIO pins
void ultrasonic_init(void) {
    // Configure trigger pin as output
    gpio_config_t trig_config = {
        .pin_bit_mask = (1ULL << TRIG_PIN),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    gpio_config(&trig_config);
    
    // Configure echo pin as input
    gpio_config_t echo_config = {
        .pin_bit_mask = (1ULL << ECHO_PIN),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    gpio_config(&echo_config);
    
    // Set trigger pin low initially
    gpio_set_level(TRIG_PIN, 0);
}

// Read distance in centimeters
float read_distance(void) {
    // Send 10us trigger pulse
    gpio_set_level(TRIG_PIN, 1);
    esp_rom_delay_us(10);
    gpio_set_level(TRIG_PIN, 0);
    
    // Wait for echo pin to go high
    int64_t start_time = esp_timer_get_time();
    while (gpio_get_level(ECHO_PIN) == 0) {
        if ((esp_timer_get_time() - start_time) > 30000) { // 30ms timeout
            return -1; // Timeout
        }
    }
    
    // Measure pulse duration
    int64_t pulse_start = esp_timer_get_time();
    while (gpio_get_level(ECHO_PIN) == 1) {
        if ((esp_timer_get_time() - pulse_start) > 30000) { // 30ms timeout
            return -1; // Timeout
        }
    }
    int64_t pulse_end = esp_timer_get_time();
    
    // Calculate distance (speed of sound = 343 m/s = 0.0343 cm/us)
    // Distance = (pulse_duration * 0.0343) / 2
    float duration_us = (float)(pulse_end - pulse_start);
    float distance_cm = (duration_us * 0.0343) / 2.0;
    
    return distance_cm;
}

void app_main(void) {
    ESP_LOGI(TAG, "Ultrasonic sensor POC starting...");
    
    // Initialize ultrasonic sensor
    ultrasonic_init();
    
    // Main loop
    while (1) {
        float distance = read_distance();
        
        if (distance > 0) {
            ESP_LOGI(TAG, "Distance: %.2f cm", distance);
        } else {
            ESP_LOGI(TAG, "Measurement timeout or error");
        }
        
        vTaskDelay(pdMS_TO_TICKS(500)); // Read every 500ms
    }
}