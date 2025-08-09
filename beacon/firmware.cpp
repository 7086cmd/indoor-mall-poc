#include "BLEDevice.h"
#include "BLEServer.h"
#include "BLEUtils.h"
#include "BLE2902.h"
#include "BLEBeacon.h"

// Configuration
#define BEACON_UUID "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"  // Your custom UUID
#define SERVICE_UUID "12345678-1234-1234-1234-123456789ABC"
#define CHARACTERISTIC_UUID "87654321-4321-4321-4321-CBA987654321"

// Store Configuration - Update for each beacon
const String STORE_ID = "store_restaurant_001";  // Unique store identifier
const String MALL_ID = "ningbo_mall_central";
const String FLOOR_ID = "floor_2";
const int TRANSMIT_POWER = 4;  // Adjust for range control
const int ADVERTISING_INTERVAL = 100;  // milliseconds

BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected = false;

// Beacon data structure
struct BeaconData {
  String storeId;
  String mallId;
  String floorId;
  String storeName;
  String storeType;
  uint32_t timestamp;
  int8_t txPower;
};

class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Device connected");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Device disconnected");
  }
};

void setup() {
  Serial.begin(115200);
  Serial.println("Initializing BLE Store Beacon...");

  // Initialize BLE
  BLEDevice::init("Store_Beacon_" + STORE_ID);
  
  // Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  // Create BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create Characteristic for store data
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  // Set initial store data
  updateStoreData();

  // Start service
  pService->start();

  // Setup advertising
  setupAdvertising();
  
  Serial.println("BLE Store Beacon ready!");
  Serial.println("Store ID: " + STORE_ID);
}

void setupAdvertising() {
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  
  // Create custom advertising data
  BLEAdvertisementData advertisementData;
  advertisementData.setFlags(0x06); // BR_EDR_NOT_SUPPORTED | LE_GENERAL_DISC_MODE
  
  // Add service UUID
  advertisementData.setCompleteServices(BLEUUID(SERVICE_UUID));
  
  // Add store ID in manufacturer data
  std::string storeData = STORE_ID.c_str();
  advertisementData.setManufacturerData(storeData);
  
  // Set advertising data
  pAdvertising->setAdvertisementData(advertisementData);
  
  // Configure advertising parameters
  pAdvertising->setMinInterval(ADVERTISING_INTERVAL);
  pAdvertising->setMaxInterval(ADVERTISING_INTERVAL);
  
  // Start advertising
  pAdvertising->start();
}

void updateStoreData() {
  // Create JSON payload with store information
  String payload = "{";
  payload += "\"storeId\":\"" + STORE_ID + "\",";
  payload += "\"mallId\":\"" + MALL_ID + "\",";
  payload += "\"floorId\":\"" + FLOOR_ID + "\",";
  payload += "\"storeName\":\"Premium Coffee Shop\",";
  payload += "\"storeType\":\"restaurant\",";
  payload += "\"timestamp\":" + String(millis()) + ",";
  payload += "\"txPower\":" + String(TRANSMIT_POWER);
  payload += "}";
  
  pCharacteristic->setValue(payload.c_str());
  
  if (deviceConnected) {
    pCharacteristic->notify();
  }
}

void loop() {
  // Update store data every 30 seconds
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 30000) {
    updateStoreData();
    lastUpdate = millis();
  }
  
  // Handle disconnection
  if (!deviceConnected && pServer->getConnectedCount() == 0) {
    delay(500);
    pServer->startAdvertising();
  }
  
  delay(100);
}