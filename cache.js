// cache.js
const mongoose = require('mongoose');

// Define a schema for caching API responses
const cacheSchema = new mongoose.Schema({
  requestUrl: { type: String, unique: true },
  responseData: Object,
});

// Create a model for the cache collection
const Cache = mongoose.model('Cache', cacheSchema);

module.exports = Cache;
