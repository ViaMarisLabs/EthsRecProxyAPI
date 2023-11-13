# EthsRecProxyAPI

EthsRecProxyAPI is an Ethscriptions recursive proxy API designed to facilitate proxy requests between blockchain indexers and media resources.

## Features

- Seamless proxy requests: EthsRecProxyAPI simplifies the process of fetching media resources from the Ethereum blockchain by acting as an intermediary between your application and blockchain indexers.
- Efficient media retrieval: With EthsRecProxyAPI, you can retrieve media assets such as images, audio, video, pdf.
- Caching: The API includes an optional caching mechanism powered by MongoDB which selectively caches responses based on whether a recursion match is found. While caching is not required, it can significantly improve performance by reducing the load on blockchain indexers, upstream APIs, and speeding up repetitive requests. 
- Recursive content handling: EthsRecProxyAPI supports recursive content handling, allowing you to process and replace content placeholders within media resources to ensure that they are displayed correctly.

## Getting Started

### Prerequisites

Before you begin, make sure you have the following prerequisites installed:

- Node.js
- MongoDB (optional for caching)

### Installation

1. Clone this repository:

   ```shell
   git clone https://github.com/ViaMarisLabs/EthsRecProxyAPI.git
   cd EthsRecProxyAPI

2. Install the required Node.js packages:
   ```shell
   npm install express cors cluster node-fetch mongoose base-64

3. If you wish to use caching with MongoDB, configure the MongoDB connection by updating the dbUrl variable in the code with your MongoDB URL:

   ```shell
   const dbUrl = 'mongodb://localhost:27017/your-database'; // Replace with your actual MongoDB URL

4. Start the server
   ```shell
   node App.js

The server should now be running on the specified port (default is 3000).

### Usage

To use EthsRecProxyAPI, make HTTP GET requests to the API endpoint with the desired URL path. The API will handle fetching and proxying the requested content from the upstream Ethscriptions indexer API.

## Optional Caching with MongoDB

EthsRecProxyAPI offers an optional caching mechanism powered by MongoDB. While caching is not required, it can significantly improve performance by reducing the load on blockchain indexers and speeding up repetitive requests.

### Prerequisites
To use caching, you'll need:

MongoDB

### Configuration
1. Ensure you have MongoDB installed and running.
2. Configure the MongoDB connection by updating the dbUrl variable in the code with your MongoDB URL:
   ```shell
   const dbUrl = 'mongodb://localhost:27017/your-database'; // Replace with your actual MongoDB URL
3. Start the server as usual:
   ```shell
   npm start

With caching enabled, EthsRecProxyAPI will store previously fetched responses in the MongoDB database, allowing for quicker retrieval of frequently accessed content.

Keep in mind that caching is optional, and you can choose to use EthsRecProxyAPI without it if it better suits your project's requirements.

### Contributing

We welcome contributions from the community!

### License

This project is licensed under the MIT License.

### Acknowledgments

This project was initially motivated by the goal of achieving efficient media retrieval from the Ethereum blockchain, with a primary focus on reducing gas costs.

