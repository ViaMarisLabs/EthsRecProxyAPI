const express = require('express');
const cors = require('cors');
const cluster = require('cluster');
const os = require('os');
const base64 = require('base-64');
const fetch = require('node-fetch');
const mongoose = require('mongoose'); 
const Cache = require('./cache'); 

const API_ENDPOINT = "https://api.ethscriptions.com/";
const app = express();
app.use(cors());

const dbUrl = 'mongodb://localhost:27017/apiviamaris8'; 
mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

async function fetchApiData(transactionHash) {
  const apiUrl = API_ENDPOINT + "api/ethscriptions/" + transactionHash;
  console.log(`Fetching API data for transaction hash: ${transactionHash}`);
  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`Received a non-successful HTTP response: ${response.status}`);
    }
  } catch (error) {
    console.error(`Failed to fetch API data: ${error.message}`);
    return null;
  }
}

async function replacePlaceholders(content) {
  const escPlaceholders = content.match(/esc:\/\/0x\w+/g) || [];
  const escrPlaceholders = content.match(/escr:\/\/0x\w+/g) || [];

  const promises = [];

  escPlaceholders.forEach(placeholder => {
    const transactionHash = placeholder.split('//').pop();
    if (transactionHash.match(/^0x\w+$/)) {
      const apiData = fetchApiData(transactionHash);
      promises.push(apiData.then(data => {
        if (data && data.content_uri) {
          content = content.replace(placeholder, data.content_uri);
        } else {
          console.error(`Error: content_uri not found for transaction hash ${transactionHash}`);
        }
      }));
    } else {
      console.error(`Invalid transaction hash format: ${transactionHash}`);
    }
  });

  escrPlaceholders.forEach(placeholder => {
    const transactionHash = placeholder.split('//').pop();
    if (transactionHash.match(/^0x\w+$/)) {
      const apiData = fetchApiData(transactionHash);
      promises.push(apiData.then(data => {
        if (data && data.content_uri) {
          const encodedContent = data.content_uri.split(',').pop();
          const decodedContent = base64.decode(encodedContent);
          content = content.replace(placeholder, decodedContent);
        } else {
          console.error(`Error: content_uri not found for transaction hash ${transactionHash}`);
        }
      }));
    } else {
      console.error(`Invalid transaction hash format: ${transactionHash}`);
    }
  });

  await Promise.all(promises);
  return content;
}

async function processSvgContentUri(svgBase64Content) {
  let decodedSvg = base64.decode(svgBase64Content);
  decodedSvg = await replacePlaceholders(decodedSvg);
  return base64.encode(decodedSvg);
}

async function processNestedContentUri(obj) {
  if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (key === 'content_uri' && typeof value === 'string' && (value.includes("data:application/vnd.esc.recursion") || value.includes("data:image/svg+xml"))) {
          if (value.includes("data:image/svg+xml")) {
            const base64Content = value.split('base64,')[1];
            const processedSvgContent = await processSvgContentUri(base64Content);
            obj[key] = `data:image/svg+xml;base64,${processedSvgContent}`;
          } else {
            await processContentUri(obj); 
          }
        } else if (typeof value === 'object') {
          await processNestedContentUri(value); 
        }
      }
    }
  }
}

app.get('/*', async (req, res) => {
  console.log(`Received request for URL: ${req.url}`);
  const apiUrl = API_ENDPOINT + req.url;

  try {
    const cachedResponse = await Cache.findOne({ requestUrl: apiUrl });

    if (cachedResponse) {
      console.log('Using cached response');
      return res.json(cachedResponse.responseData);
    }

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Received a non-successful HTTP response: ${response.status}`);
    }

    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.startsWith('image/svg+xml')) {
      let responseData = await response.text(); 
      const originalResponseData = responseData; 

      responseData = await replacePlaceholders(responseData);
      const shouldCacheResponse = responseData !== originalResponseData; 

      res.setHeader('Content-Type', contentType);
      res.send(responseData);

      if (shouldCacheResponse) {
        const newCacheEntry = new Cache({
          requestUrl: apiUrl,
          responseData: responseData,
        });
        await newCacheEntry.save();
      }
    } else {
      const originalResponse = await response.json();
      const copyOfOriginalResponse = JSON.parse(JSON.stringify(originalResponse)); 

      await processNestedContentUri(originalResponse);
      const shouldCacheResponse = JSON.stringify(originalResponse) !== JSON.stringify(copyOfOriginalResponse); 

      addOriginalContentUri(originalResponse, originalResponse.content_uri);
      res.json(originalResponse);

      if (shouldCacheResponse) {
        const newCacheEntry = new Cache({
          requestUrl: apiUrl,
          responseData: originalResponse,
        });
        await newCacheEntry.save();
      }
    }
  } catch (error) {
    console.error(`Error processing request: ${error.message}`);
    res.status(500).send(`Error: ${error.message}`);
  }
});

function addOriginalContentUri(responseData, originalContentUri) {
  responseData.original_content_uri = originalContentUri;
}

async function processContentUri(obj) {
  const mimeMatch = obj.content_uri.match(/data:application\/vnd\.esc\.recursion\.(\w+\/[\w+-]+)\+json/);
  if (mimeMatch && mimeMatch[1]) {
    const mimeType = mimeMatch[1].split('+json')[0];
    const encodedContent = obj.content_uri.split('base64,').pop();
    const decodedContent = base64.decode(encodedContent);
    const updatedContent = await replacePlaceholders(decodedContent);
    const encodedUpdatedContent = base64.encode(updatedContent);
    obj.content_uri = `data:${mimeType};base64,${encodedUpdatedContent}`;
    obj.mimetype = mimeType;
  } else {
    console.error("MIME type not found in content_uri.");
  }
}

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', worker => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
