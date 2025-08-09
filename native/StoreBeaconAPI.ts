export class StoreBeaconAPI {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async getStoreDetails(storeId: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/api/stores/${storeId}`);
    return response.json();
  }

  async logStoreVisit(storeId: string, userId: string, rssi: number, duration: number): Promise<void> {
    await fetch(`${this.baseURL}/api/analytics/store-visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId,
        userId,
        rssi,
        duration,
        timestamp: new Date().toISOString()
      })
    });
  }

  async getStorePromotions(storeId: string): Promise<any[]> {
    const response = await fetch(`${this.baseURL}/api/stores/${storeId}/promotions`);
    return response.json();
  }
}