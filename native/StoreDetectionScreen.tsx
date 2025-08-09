import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import { StoreBLEManager, StoreBeaconData } from './BLEManager';

export const StoreDetectionScreen: React.FC = () => {
  const [bleManager] = useState(new StoreBLEManager());
  const [nearbyStores, setNearbyStores] = useState<StoreBeaconData[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    initializeBLE();
    return () => {
      bleManager.destroy();
    };
  }, []);

  const initializeBLE = async () => {
    const initialized = await bleManager.initialize();
    if (!initialized) {
      Alert.alert('Error', 'Failed to initialize Bluetooth');
      return;
    }

    // Set up callbacks
    bleManager.setStoreCallbacks(
      (store: StoreBeaconData) => {
        console.log('Store discovered:', store);
        setNearbyStores(prev => {
          const updated = prev.filter(s => s.storeId !== store.storeId);
          return [...updated, store].sort((a, b) => a.distance - b.distance);
        });
        
        // Show notification for new store
        showStoreNotification(store);
      },
      (storeId: string) => {
        console.log('Store left:', storeId);
        setNearbyStores(prev => prev.filter(s => s.storeId !== storeId));
      }
    );

    // Start scanning
    startScanning();
  };

  const startScanning = async () => {
    setIsScanning(true);
    await bleManager.startStoreDetection();
    
    // Restart scanning every 15 seconds to keep discovering
    setTimeout(() => {
      if (isScanning) {
        bleManager.stopStoreDetection();
        setTimeout(() => startScanning(), 1000);
      }
    }, 15000);
  };

  const showStoreNotification = (store: StoreBeaconData) => {
    // You can integrate with push notifications here
    Alert.alert(
      'Store Nearby!',
      `You're near ${store.storeName}\nDistance: ${store.distance.toFixed(1)}m`,
      [
        { text: 'Ignore', style: 'cancel' },
        { text: 'View Menu', onPress: () => openStoreMenu(store) }
      ]
    );
  };

  const openStoreMenu = (store: StoreBeaconData) => {
    // Navigate to store details/menu
    console.log('Opening menu for:', store.storeName);
  };

  const renderStoreItem = ({ item }: { item: StoreBeaconData }) => (
    <View style={{
      padding: 16,
      margin: 8,
      backgroundColor: '#f5f5f5',
      borderRadius: 8,
      borderLeft: `4px solid ${item.distance < 5 ? '#4CAF50' : '#FFC107'}`
    }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.storeName}</Text>
      <Text style={{ color: '#666' }}>{item.storeType}</Text>
      <Text style={{ color: '#999' }}>
        Distance: {item.distance.toFixed(1)}m | Signal: {item.rssi}dBm
      </Text>
      <Text style={{ color: '#999', fontSize: 12 }}>
        ID: {item.storeId}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Nearby Stores ({nearbyStores.length})
      </Text>
      
      <Text style={{ marginBottom: 16, color: isScanning ? '#4CAF50' : '#999' }}>
        {isScanning ? 'Scanning for stores...' : 'Scan stopped'}
      </Text>

      <FlatList
        data={nearbyStores}
        keyExtractor={(item) => item.storeId}
        renderItem={renderStoreItem}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#999', marginTop: 50 }}>
            No stores detected nearby
          </Text>
        }
      />
    </View>
  );
};
