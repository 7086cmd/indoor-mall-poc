import { BleManager, Device, Characteristic, ScanMode } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

export interface StoreBeaconData {
  storeId: string;
  mallId: string;
  floorId: string;
  storeName: string;
  storeType: string;
  timestamp: number;
  txPower: number;
  rssi: number;
  distance: number;
}

export class StoreBLEManager {
  private manager: BleManager;
  private isScanning: boolean = false;
  private discoveredStores: Map<string, StoreBeaconData> = new Map();
  private onStoreDiscovered?: (store: StoreBeaconData) => void;
  private onStoreLeft?: (storeId: string) => void;

  // Configuration
  private readonly SERVICE_UUID = "12345678-1234-1234-1234-123456789ABC";
  private readonly CHARACTERISTIC_UUID = "87654321-4321-4321-4321-CBA987654321";
  private readonly SCAN_TIMEOUT = 10000; // 10 seconds
  private readonly PROXIMITY_THRESHOLD = -70; // RSSI threshold for "nearby"
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.manager = new BleManager();
    this.setupCleanupTimer();
  }

  async initialize(): Promise<boolean> {
    try {
      // Request permissions
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);

        const allGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          throw new Error('Required permissions not granted');
        }
      }

      // Check Bluetooth state
      const state = await this.manager.state();
      if (state !== 'PoweredOn') {
        throw new Error('Bluetooth is not powered on');
      }

      return true;
    } catch (error) {
      console.error('BLE initialization failed:', error);
      return false;
    }
  }

  setStoreCallbacks(
    onDiscovered: (store: StoreBeaconData) => void,
    onLeft: (storeId: string) => void
  ) {
    this.onStoreDiscovered = onDiscovered;
    this.onStoreLeft = onLeft;
  }

  async startStoreDetection(): Promise<void> {
    if (this.isScanning) {
      return;
    }

    try {
      this.isScanning = true;
      console.log('Starting BLE scan for store beacons...');

      this.manager.startDeviceScan(
        [this.SERVICE_UUID], // Only scan for our service
        {
          allowDuplicates: true, // Important for RSSI updates
          scanMode: ScanMode.LowLatency,
        },
        this.handleDeviceDiscovered.bind(this)
      );

      // Auto-stop scan after timeout
      setTimeout(() => {
        if (this.isScanning) {
          this.stopStoreDetection();
        }
      }, this.SCAN_TIMEOUT);

    } catch (error) {
      console.error('Failed to start store detection:', error);
      this.isScanning = false;
    }
  }

  stopStoreDetection(): void {
    if (!this.isScanning) {
      return;
    }

    this.manager.stopDeviceScan();
    this.isScanning = false;
    console.log('Stopped BLE scan');
  }

  private async handleDeviceDiscovered(error: any, device: Device | null): Promise<void> {
    if (error) {
      console.error('BLE scan error:', error);
      return;
    }

    if (!device || !device.manufacturerData) {
      return;
    }

    try {
      // Parse store ID from manufacturer data
      const storeId = this.parseStoreIdFromManufacturerData(device.manufacturerData);
      if (!storeId) {
        return;
      }

      // Calculate distance from RSSI
      const distance = this.calculateDistance(device.rssi || -100, -59); // -59 is typical 1m RSSI

      // Check if device is nearby
      if ((device.rssi || -100) < this.PROXIMITY_THRESHOLD) {
        return; // Too far away
      }

      // Connect and read detailed store data
      const storeData = await this.readStoreData(device, storeId, distance);
      if (storeData) {
        this.handleStoreNearby(storeData);
      }

    } catch (error) {
      console.error('Error processing discovered device:', error);
    }
  }

  private parseStoreIdFromManufacturerData(data: string): string | null {
    try {
      // Manufacturer data contains store ID as string
      return data;
    } catch (error) {
      console.error('Failed to parse manufacturer data:', error);
      return null;
    }
  }

  private async readStoreData(device: Device, storeId: string, distance: number): Promise<StoreBeaconData | null> {
    try {
      // Connect to device
      const connectedDevice = await device.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();

      // Read characteristic
      const characteristic = await connectedDevice.readCharacteristicForService(
        this.SERVICE_UUID,
        this.CHARACTERISTIC_UUID
      );

      // Disconnect immediately
      await connectedDevice.cancelConnection();

      // Parse JSON data
      const base64Data = characteristic.value;
      if (!base64Data) {
        return null;
      }

      const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
      const storeInfo = JSON.parse(jsonString);

      return {
        ...storeInfo,
        rssi: device.rssi || -100,
        distance: distance
      };

    } catch (error) {
      console.error('Failed to read store data:', error);
      return null;
    }
  }

  private calculateDistance(rssi: number, txPower: number): number {
    if (rssi === 0) {
      return -1.0;
    }

    const ratio = txPower / rssi;
    if (ratio < 1.0) {
      return Math.pow(ratio, 10);
    } else {
      const accuracy = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
      return accuracy;
    }
  }

  private handleStoreNearby(storeData: StoreBeaconData): void {
    const existingStore = this.discoveredStores.get(storeData.storeId);
    
    if (!existingStore) {
      // New store discovered
      this.discoveredStores.set(storeData.storeId, {
        ...storeData,
        timestamp: Date.now()
      });
      
      console.log(`Discovered new store: ${storeData.storeName}`);
      this.onStoreDiscovered?.(storeData);
    } else {
      // Update existing store data
      this.discoveredStores.set(storeData.storeId, {
        ...storeData,
        timestamp: Date.now()
      });
    }
  }

  private setupCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      const storesLeft: string[] = [];

      for (const [storeId, storeData] of this.discoveredStores.entries()) {
        // Remove stores not seen for 30 seconds
        if (now - storeData.timestamp > this.CLEANUP_INTERVAL) {
          this.discoveredStores.delete(storeId);
          storesLeft.push(storeId);
        }
      }

      // Notify about stores left
      storesLeft.forEach(storeId => {
        console.log(`Left store: ${storeId}`);
        this.onStoreLeft?.(storeId);
      });
    }, this.CLEANUP_INTERVAL);
  }

  getNearbyStores(): StoreBeaconData[] {
    return Array.from(this.discoveredStores.values())
      .sort((a, b) => a.distance - b.distance); // Sort by distance
  }

  getStoreById(storeId: string): StoreBeaconData | undefined {
    return this.discoveredStores.get(storeId);
  }

  destroy(): void {
    this.stopStoreDetection();
    this.manager.destroy();
  }
}
