# indoor-mall-poc

Proof of Concept repo for an indoor mall navigation system.

It's a PoC of indoor navigation using a combination of computer vision and machine learning techniques, mixed with BLE (Bluetooth Low Energy) beacons for precise location tracking.

We believe it's unnecessary to rely solely on GPS for indoor navigation, as it can be inaccurate and unreliable in complex environments like malls.
Instead, we only need to exactly know _where the user is_, only knowing the shop nearby, could determine the user's location with high precision.

Hence, we can create a robust indoor navigation system that leverages both visual and spatial data to guide users effectively through complex mall environments.

## Components

### BLE Beacons

The BLE beacons are small, battery-powered devices that transmit a continuous signal containing a unique identifier. These beacons can be placed throughout the mall to create a network of reference points that can be used to determine a user's location with high accuracy.

When a user's device comes within range of a beacon, it can receive the beacon's signal and use it to triangulate its position. By combining the signals from multiple beacons, we can achieve precise indoor positioning that is not reliant on GPS.

We use ESP32-based BLE beacons for this purpose, as they offer a good balance between cost, power consumption, and performance.

### Central Server

The central server is responsible for processing the data collected from the BLE beacons and the computer vision system. It aggregates the location information and uses machine learning algorithms to improve the accuracy of the positioning system over time.

The server also handles user requests, such as providing navigation instructions or information about nearby shops. It communicates with the user's device via a REST API, allowing for seamless integration with mobile applications.

We use a universal schema to define the mall layout, including shops, restaurants, facilities, transportations, kiosks, etc., ensuring consistency and ease of use across the system.

### Mobile App

The mobile app is the core of the system, as it provides the interface for users to interact with the navigation system. It displays real-time location information, navigation instructions, and nearby points of interest.

The app uses the data from the central server to provide a user-friendly experience, allowing users to easily find their way around the mall.

### Surveillance Camera

We could leverage the surveillance camera to monitor the status of shops, including recognizing shops, detecting customer traffic patterns, identifying open dates, etc.

## Functionalities

### Navigation

We could use algorithms to determine the best route to the shop, often straightforward. By analyzing the mall layout and the user's current location, we can provide turn-by-turn directions to guide the user to their destination, including where to go to the escalators or elevators. We could also incorporate real-time data from the surveillance cameras to adjust the navigation instructions based on current foot traffic and other dynamic factors.

During the navigation process, the app could provide real-time location updates according to the BLE beacons, ensuring that users are always aware of their position within the mall.

### Automatic Mall Administration

We could implement an automatic mall administration system that leverages the data collected from the BLE beacons, surveillance cameras, and user interactions to optimize mall operations. This system could include features such as:

- **Dynamic Store Management**: Automatically adjusting store layouts, promotions, and inventory based on real-time customer traffic patterns and preferences.
- **Maintenance Alerts**: Detecting and reporting maintenance issues (e.g., escalator outages, restroom supplies) to mall management for prompt resolution.
- **Customer Insights**: Analyzing customer behavior and preferences to provide personalized marketing and improve the overall shopping experience.
- **Automatic Map Generation**: Continuously updating the mall map based on the schema and real-time data from the BLE beacons and surveillance cameras.

### "First Mile" Automatic Delivery

We could integrate with robotics solutions to facilitate the "first mile" delivery process within the mall. This could involve using autonomous robots to transport goods from storage areas to retail locations, ensuring efficient and timely deliveries while minimizing human intervention.

It can help the deliverer optimize their route by reducing time to destination and avoiding obstacles in the mall, and bring the items directly from the gate of the mall.
It can also provide in-mall delivery, like sending items from one store while you are in a restaurant, or ordering a boba tea, which is not provided in a certain restaurant, to be delivered to your location from a milky tea shop.

## Scaling Up

It's not just a mall system—it could be leveraged in other large-scale indoor environments, including airports, train stations, and convention centers. The modular architecture and universal schema make it adaptable to various use cases, ensuring a consistent and efficient user experience across different settings.
