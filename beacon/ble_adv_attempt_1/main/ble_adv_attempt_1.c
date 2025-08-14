#include <stdio.h>
#include <string.h>
#include "esp_bt.h"
#include "esp_gap_ble_api.h"
#include "esp_gatts_api.h"
#include "esp_bt_main.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "nvs_flash.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"

#define DEVICE_NAME "ESP32-POC"
#define GATTS_TAG "BLE_POC"
#define WIFI_SSID "TP-LINK_2075"
#define WIFI_PASS "_WuChengyu20230616"  // Add password here if needed

// WiFi event group
static EventGroupHandle_t s_wifi_event_group;
#define WIFI_CONNECTED_BIT BIT0
#define WIFI_FAIL_BIT      BIT1

// Custom service and characteristic UUIDs
static uint8_t service_uuid[16] = {
    0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12, 0x34, 0x12, 
    0x34, 0x12, 0x34, 0x12, 0x78, 0x56, 0x34, 0x12
};

static uint8_t char_uuid[16] = {
    0x21, 0x43, 0x65, 0x87, 0xa9, 0xcb, 0x21, 0x43,
    0x21, 0x43, 0x21, 0x43, 0x21, 0x43, 0x65, 0x87
};

static esp_ble_adv_data_t adv_data = {
    .set_scan_rsp = false,
    .include_name = true,
    .service_uuid_len = 16,
    .p_service_uuid = service_uuid,
    .flag = (ESP_BLE_ADV_FLAG_GEN_DISC | ESP_BLE_ADV_FLAG_BREDR_NOT_SPT),
};

static esp_ble_adv_params_t adv_params = {
    .adv_int_min = 0x20,
    .adv_int_max = 0x40,
    .adv_type = ADV_TYPE_IND,
    .own_addr_type = BLE_ADDR_TYPE_PUBLIC,
    .channel_map = ADV_CHNL_ALL,
    .adv_filter_policy = ADV_FILTER_ALLOW_SCAN_ANY_CON_ANY,
};

// Global variables
static uint16_t gatts_if_global = ESP_GATT_IF_NONE;
static uint16_t conn_id_global = 0;
static uint16_t service_handle = 0;
static uint16_t char_handle = 0;
static int wifi_retry_num = 0;

// WiFi event handler
static void event_handler(void* arg, esp_event_base_t event_base, int32_t event_id, void* event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        if (wifi_retry_num < 5) {
            esp_wifi_connect();
            wifi_retry_num++;
            printf("Retry connecting to WiFi\n");
        } else {
            xEventGroupSetBits(s_wifi_event_group, WIFI_FAIL_BIT);
        }
        printf("Failed to connect to WiFi\n");
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t* event = (ip_event_got_ip_t*) event_data;
        printf("WiFi connected! IP: " IPSTR "\n", IP2STR(&event->ip_info.ip));
        wifi_retry_num = 0;
        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
    }
}

void wifi_init_sta(void)
{
    s_wifi_event_group = xEventGroupCreate();
    
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t instance_any_id;
    esp_event_handler_instance_t instance_got_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT,
                                                        ESP_EVENT_ANY_ID,
                                                        &event_handler,
                                                        NULL,
                                                        &instance_any_id));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT,
                                                        IP_EVENT_STA_GOT_IP,
                                                        &event_handler,
                                                        NULL,
                                                        &instance_got_ip));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASS,
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
            .pmf_cfg = {
                .capable = true,
                .required = false
            },
        },
    };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA) );
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config) );
    ESP_ERROR_CHECK(esp_wifi_start() );

    printf("Connecting to WiFi SSID: %s\n", WIFI_SSID);

    EventBits_t bits = xEventGroupWaitBits(s_wifi_event_group,
            WIFI_CONNECTED_BIT | WIFI_FAIL_BIT,
            pdFALSE,
            pdFALSE,
            portMAX_DELAY);

    if (bits & WIFI_CONNECTED_BIT) {
        printf("Connected to WiFi successfully\n");
    } else if (bits & WIFI_FAIL_BIT) {
        printf("Failed to connect to WiFi\n");
    }
}

static void gap_event_handler(esp_gap_ble_cb_event_t event, esp_ble_gap_cb_param_t *param)
{
    switch (event) {
    case ESP_GAP_BLE_ADV_DATA_SET_COMPLETE_EVT:
        esp_ble_gap_start_advertising(&adv_params);
        break;
    case ESP_GAP_BLE_ADV_START_COMPLETE_EVT:
        printf("BLE advertising started\n");
        break;
    default:
        break;
    }
}

static void gatts_event_handler(esp_gatts_cb_event_t event, esp_gatt_if_t gatts_if, esp_ble_gatts_cb_param_t *param)
{
    switch (event) {
    case ESP_GATTS_REG_EVT:
        printf("GATT server registered\n");
        gatts_if_global = gatts_if;
        
        // Create service
        esp_ble_gatts_create_service(gatts_if, 
            &(esp_gatt_srvc_id_t){
                .is_primary = true,
                .id = {
                    .inst_id = 0,
                    .uuid = {
                        .len = ESP_UUID_LEN_128,
                        .uuid = {.uuid128 = {0}}
                    }
                }
            }, 4);
        memcpy(((esp_gatt_srvc_id_t*)&param->create.service_id)->id.uuid.uuid.uuid128, service_uuid, 16);
        break;
        
    case ESP_GATTS_CREATE_EVT:
        printf("Service created, handle: %d\n", param->create.service_handle);
        service_handle = param->create.service_handle;
        
        // Start service
        esp_ble_gatts_start_service(service_handle);
        
        // Add characteristic
        esp_ble_gatts_add_char(service_handle,
            &(esp_bt_uuid_t){
                .len = ESP_UUID_LEN_128,
                .uuid = {.uuid128 = {0}}
            },
            ESP_GATT_PERM_READ | ESP_GATT_PERM_WRITE,
            ESP_GATT_CHAR_PROP_BIT_READ | ESP_GATT_CHAR_PROP_BIT_WRITE | ESP_GATT_CHAR_PROP_BIT_NOTIFY,
            &(esp_attr_value_t){
                .attr_max_len = 100,
                .attr_len = 11,
                .attr_value = (uint8_t*)"Hello World"
            }, NULL);
        memcpy(((esp_bt_uuid_t*)&param->add_char.char_uuid)->uuid.uuid128, char_uuid, 16);
        break;
        
    case ESP_GATTS_ADD_CHAR_EVT:
        printf("Characteristic added, handle: %d\n", param->add_char.attr_handle);
        char_handle = param->add_char.attr_handle;
        break;
        
    case ESP_GATTS_CONNECT_EVT:
        printf("BLE Client connected! Sending Hello World...\n");
        conn_id_global = param->connect.conn_id;
        
        // Send message with WiFi status
        char message[100];
        snprintf(message, sizeof(message), "Hello from ESP32! WiFi: %s", 
                 (s_wifi_event_group && (xEventGroupGetBits(s_wifi_event_group) & WIFI_CONNECTED_BIT)) 
                 ? "Connected" : "Disconnected");
                 
        esp_ble_gatts_set_attr_value(char_handle, strlen(message), (uint8_t*)message);
        esp_ble_gatts_send_indicate(gatts_if, conn_id_global, char_handle, 
                                   strlen(message), (uint8_t*)message, false);
        break;
        
    case ESP_GATTS_DISCONNECT_EVT:
        printf("BLE Client disconnected, restarting advertising\n");
        esp_ble_gap_start_advertising(&adv_params);
        break;
        
    case ESP_GATTS_READ_EVT:
        printf("Client reading BLE data\n");
        break;
        
    default:
        break;
    }
}

void app_main(void)
{
    // Initialize NVS
    nvs_flash_init();
    
    // Initialize WiFi first
    printf("Initializing WiFi...\n");
    wifi_init_sta();
    
    // Initialize BT controller (coexistence mode)
    ESP_ERROR_CHECK(esp_bt_controller_mem_release(ESP_BT_MODE_CLASSIC_BT));
    esp_bt_controller_config_t bt_cfg = BT_CONTROLLER_INIT_CONFIG_DEFAULT();
    esp_bt_controller_init(&bt_cfg);
    esp_bt_controller_enable(ESP_BT_MODE_BLE);
    
    // Initialize Bluedroid stack
    esp_bluedroid_init();
    esp_bluedroid_enable();
    
    // Set device name
    esp_ble_gap_set_device_name(DEVICE_NAME);
    
    // Register callbacks
    esp_ble_gap_register_callback(gap_event_handler);
    esp_ble_gatts_register_callback(gatts_event_handler);
    
    // Register GATT app
    esp_ble_gatts_app_register(0);
    
    // Configure and start advertising
    esp_ble_gap_config_adv_data(&adv_data);
    
    printf("ESP32 ready with WiFi + BLE!\n");
}