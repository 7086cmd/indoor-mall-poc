// Core Types and Enums
export enum EntityType {
  // Commercial
  STORE = 'store',
  RESTAURANT = 'restaurant',
  FOOD_COURT = 'food_court',
  KIOSK = 'kiosk',
  ATM = 'atm',
  
  // Navigation & Infrastructure
  ELEVATOR = 'elevator',
  ESCALATOR = 'escalator',
  STAIRS = 'stairs',
  GATE = 'gate',
  ENTRANCE = 'entrance',
  EXIT = 'exit',
  
  // Facilities
  RESTROOM = 'restroom',
  INFORMATION = 'information',
  SECURITY = 'security',
  PARKING = 'parking',
  
  // Service Areas
  STORAGE = 'storage',
  MAINTENANCE = 'maintenance',
  STAFF_ONLY = 'staff_only',
  
  // Navigation Nodes
  CORRIDOR = 'corridor',
  PLAZA = 'plaza',
  INTERSECTION = 'intersection'
}

export enum AccessibilityLevel {
  FULLY_ACCESSIBLE = 'fully_accessible',
  PARTIALLY_ACCESSIBLE = 'partially_accessible',
  NOT_ACCESSIBLE = 'not_accessible'
}

export enum OperationalStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  MAINTENANCE = 'maintenance',
  TEMPORARILY_CLOSED = 'temporarily_closed'
}

// Geospatial Types
export interface Coordinate {
  x: number;
  y: number;
  z: number; // Floor level
}

export interface BoundingBox {
  min: Coordinate;
  max: Coordinate;
}

export interface Polygon {
  points: Coordinate[];
  holes?: Coordinate[][]; // For complex shapes with holes
}

// Base Entity Interface
export interface BaseEntity {
  id: string;
  name: string;
  type: EntityType;
  
  // Spatial Data
  position: Coordinate;
  boundingBox?: BoundingBox;
  polygon?: Polygon;
  area?: number; // Square meters
  
  // Hierarchical Structure
  mallId: string;
  floorId: string;
  zoneId?: string;
  parentId?: string;
  childIds?: string[];
  
  // Operational Data
  status: OperationalStatus;
  accessibility: AccessibilityLevel;
  
  // Metadata
  tags: string[];
  properties: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastVerified?: Date;
}

// Specialized Entity Types
export interface Store extends BaseEntity {
  type: EntityType.STORE;
  category: string; // 'clothing', 'electronics', 'jewelry', etc.
  brand?: string;
  storeNumber?: string;
  
  // Operating Hours
  operatingHours: {
    [key: string]: { // 'monday', 'tuesday', etc.
      open: string; // '09:00'
      close: string; // '22:00'
      closed?: boolean;
    }
  };
  
  // Commercial Data
  phone?: string;
  website?: string;
  description?: string;
  priceRange?: 'budget' | 'mid' | 'luxury';
  
  // Services
  services: string[]; // ['alterations', 'gift_wrapping', 'personal_shopping']
  paymentMethods: string[]; // ['cash', 'card', 'mobile_pay', 'contactless']
  
  // Integration
  posSystemId?: string;
  inventorySystemId?: string;
}

export interface Restaurant extends BaseEntity {
  type: EntityType.RESTAURANT;
  cuisine: string[]; // ['chinese', 'italian', 'fast_food']
  dietaryOptions: string[]; // ['vegetarian', 'vegan', 'halal', 'kosher']
  
  // Operating Data
  operatingHours: Store['operatingHours'];
  averageWaitTime?: number; // minutes
  capacity: {
    seating: number;
    standing?: number;
    outdoor?: number;
  };
  
  // Service Options
  serviceTypes: string[]; // ['dine_in', 'takeout', 'delivery']
  orderMethods: string[]; // ['counter', 'kiosk', 'mobile_app', 'qr_code']
  
  // Integration
  posSystemId?: string;
  deliveryPartnerships?: string[]; // Robot delivery system IDs
}

export interface Transportation extends BaseEntity {
  type: EntityType.ELEVATOR | EntityType.ESCALATOR | EntityType.STAIRS;
  
  // Connectivity
  connectsFloors: string[]; // Floor IDs this transportation connects
  direction?: 'up' | 'down' | 'bidirectional';
  
  // Specifications
  capacity?: number; // Max people/weight
  speed?: number; // m/s for escalators, m/min for elevators
  dimensions?: {
    width: number;
    depth: number;
    height?: number;
  };
  
  // Operational
  estimatedWaitTime?: number; // seconds
  outOfService?: boolean;
  maintenanceSchedule?: Date[];
}

export interface Facility extends BaseEntity {
  type: EntityType.RESTROOM | EntityType.INFORMATION | EntityType.SECURITY;
  
  // Facility-specific data
  gender?: 'male' | 'female' | 'unisex' | 'family';
  babyChanging?: boolean;
  wheelchairAccessible?: boolean;
  
  // For information desks
  languages?: string[]; // Supported languages
  services?: string[]; // ['lost_and_found', 'customer_service', 'directions']
  
  // Real-time status
  occupancyLevel?: 'low' | 'medium' | 'high';
  cleaningStatus?: 'clean' | 'needs_cleaning' | 'being_cleaned';
}

// Navigation and Routing
export interface NavigationNode extends BaseEntity {
  type: EntityType.CORRIDOR | EntityType.PLAZA | EntityType.INTERSECTION;
  
  // Navigation properties
  connections: {
    nodeId: string;
    distance: number; // meters
    travelTime: number; // seconds
    accessible: boolean;
    bidirectional: boolean;
  }[];
  
  // Crowd management
  maxCapacity?: number;
  currentCrowdLevel?: 'low' | 'medium' | 'high';
  
  // Robot navigation
  robotAccessible: boolean;
  chargingStations?: string[]; // Charging station IDs
}

// Floor and Zone Organization
export interface Floor {
  id: string;
  mallId: string;
  level: number; // -2, -1, 0, 1, 2, etc.
  name: string; // 'Basement 2', 'Ground Floor', 'Level 1'
  
  // Spatial
  boundingBox: BoundingBox;
  totalArea: number;
  
  // Navigation
  defaultMap?: string; // Map image URL
  navigationGraph: {
    nodes: string[]; // NavigationNode IDs
    edges: {
      from: string;
      to: string;
      weight: number;
    }[];
  };
  
  // Features
  hasParking: boolean;
  hasFoodCourt: boolean;
  emergencyExits: string[]; // Entity IDs
  
  // Entities on this floor
  entities: string[]; // All entity IDs on this floor
}

export interface Zone {
  id: string;
  floorId: string;
  name: string; // 'North Wing', 'Food Court', 'Luxury Section'
  type: 'commercial' | 'dining' | 'entertainment' | 'services';
  
  // Spatial
  polygon: Polygon;
  entities: string[]; // Entity IDs in this zone
  
  // Theming
  theme?: string; // 'luxury', 'family', 'tech', etc.
  ambiance?: string; // 'quiet', 'lively', 'formal'
}

// Mall-wide Configuration
export interface Mall {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Structure
  floors: string[]; // Floor IDs
  zones: string[]; // Zone IDs
  totalArea: number;
  
  // Operating Information
  operatingHours: Store['operatingHours'];
  holidays: {
    date: string;
    name: string;
    specialHours?: {
      open: string;
      close: string;
    };
  }[];
  
  // Technology Infrastructure
  wifiNetworks: {
    ssid: string;
    coverage: string[]; // Entity IDs with coverage
  }[];
  
  beaconNetwork?: {
    beacons: {
      id: string;
      position: Coordinate;
      range: number; // meters
      batteryLevel?: number;
    }[];
  };
  
  // Services
  parkingSpaces: number;
  wheelchairRentals: boolean;
  strollerRentals: boolean;
  
  // Integration Systems
  integrations: {
    paymentSystems: string[]; // 'visa', 'mastercard', 'wechat_pay', 'alipay'
    loyaltyPrograms: string[];
    robotDeliveryVendors: string[];
    securitySystem?: string;
    buildingManagementSystem?: string;
  };
}

// Real-time Data Structures
export interface RealTimeUpdate {
  entityId: string;
  timestamp: Date;
  updateType: 'status' | 'occupancy' | 'wait_time' | 'location' | 'maintenance';
  data: Record<string, any>;
  source: 'sensor' | 'manual' | 'pos_system' | 'robot' | 'api';
}

export interface CrowdData {
  entityId: string;
  timestamp: Date;
  occupancyLevel: number; // 0-1 scale
  crowdDensity: number; // people per square meter
  waitTime?: number; // minutes
  queueLength?: number; // number of people
}

// Analytics and Business Intelligence
export interface EntityAnalytics {
  entityId: string;
  period: {
    start: Date;
    end: Date;
  };
  
  // Traffic metrics
  footTraffic: {
    total: number;
    hourlyBreakdown: Record<string, number>; // '09:00': 150
    peakHours: string[];
  };
  
  // Performance metrics
  averageVisitDuration?: number; // minutes
  conversionRate?: number; // for stores
  customerSatisfaction?: number; // 1-5 scale
  
  // Operational metrics
  uptimePercentage: number;
  maintenanceEvents: number;
  energyConsumption?: number; // kWh
}

// Event Management
export interface Event {
  id: string;
  name: string;
  type: 'promotion' | 'maintenance' | 'emergency' | 'special_hours';
  
  // Timing
  startTime: Date;
  endTime: Date;
  recurring?: {
    pattern: 'daily' | 'weekly' | 'monthly';
    endDate?: Date;
  };
  
  // Affected entities
  affectedEntities: string[];
  impact: {
    accessibility?: boolean;
    operatingHours?: {
      open: string;
      close: string;
    };
    capacity?: number;
    specialInstructions?: string;
  };
  
  // Notifications
  notifyCustomers: boolean;
  notifyStaff: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// API Response Wrapper
export interface SchemaResponse<T> {
  data: T;
  metadata: {
    version: string;
    lastUpdated: Date;
    source: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Query and Filter Types
export interface EntityQuery {
  types?: EntityType[];
  floorIds?: string[];
  zoneIds?: string[];
  tags?: string[];
  status?: OperationalStatus[];
  accessibility?: AccessibilityLevel[];
  
  // Spatial queries
  withinBounds?: BoundingBox;
  nearPosition?: {
    position: Coordinate;
    radius: number; // meters
  };
  
  // Operational filters
  openNow?: boolean;
  hasWifi?: boolean;
  acceptsPaymentMethod?: string;
  
  // Pagination
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Integration Schemas
export interface RobotDeliveryIntegration {
  vendorId: string;
  vendorName: string;
  apiEndpoint: string;
  supportedEntityTypes: EntityType[];
  
  // Capabilities
  capabilities: {
    navigation: boolean;
    obstacleAvoidance: boolean;
    multiFloor: boolean;
    charging: boolean;
    liveTracking: boolean;
  };
  
  // Operational data
  fleet: {
    robotId: string;
    status: 'available' | 'busy' | 'charging' | 'maintenance';
    currentPosition?: Coordinate;
    batteryLevel?: number;
    assignedDelivery?: string;
  }[];
}

export interface POSIntegration {
  systemId: string;
  entityId: string;
  
  // Real-time data
  currentOrders: number;
  averageOrderTime: number; // minutes
  queueLength: number;
  
  // Inventory integration
  popularItems?: {
    itemId: string;
    name: string;
    availability: boolean;
    estimatedWaitTime?: number;
  }[];
}