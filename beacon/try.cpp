#include "BLEDevice.h"
#include "BLEServer.h"
#include "BLEUtils.h"
#include "BLE2902.h"

// Define custom UUIDs
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define CHARACTERISTIC_UUID "87654321-4321-4321-4321-cba987654321"

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("Device connected");
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("Device disconnected");
    }
};

void setup() {
  Serial.begin(115200);
  Serial.println("Starting BLE work!");

  // Initialize BLE Device
  BLEDevice::init("ESP32-BLE-Device");
  
  // Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create BLE Characteristic
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ |
                      BLECharacteristic::PROPERTY_WRITE |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  // Set initial value for the characteristic
  pCharacteristic->setValue("Hello ESP32 BLE!");
  
  // Start the service
  pService->start();

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);  // set value to 0x00 to not advertise this parameter
  BLEDevice::startAdvertising();
  
  Serial.println("Waiting for a client connection to notify...");
  Serial.print("Service UUID: ");
  Serial.println(SERVICE_UUID);
}

void loop() {
  // Notify connected clients if device is connected
  if (deviceConnected) {
    String message = "ESP32 Data: " + String(millis());
    pCharacteristic->setValue(message.c_str());
    pCharacteristic->notify();
    delay(1000); // Send notification every second
  }
  
  // Handle disconnection
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); // Give time for the bluetooth stack to get ready
    pServer->startAdvertising(); // Restart advertising
    Serial.println("Start advertising again");
    oldDeviceConnected = deviceConnected;
  }
  
  // Handle new connection
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
}