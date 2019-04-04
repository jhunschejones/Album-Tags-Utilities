const request = require('request');
require('dotenv').config();
const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.ENCRYPT_KEY);
const apiToken = cryptr.encrypt(process.env.API_TOKEN);

async function getAppleAlbumData(album) {
  const options = {
    url: 'http://localhost:3000/api/v1/apple/details/' + album,
    json: true  
  };

  return new Promise(function(resolve, reject) {
    request.get(options, function(err, resp, body) {
      if (err) {
        reject(err);
      } else if (body) {
        resolve(body);
      } else {
        resolve({ "message" : `unable to find an album with ID ${album}` });
      }
    });
  });
}

async function getAllAlbums() {
  const options = {
    url: 'http://localhost:3000/api/v1/album',
    body: {
      apiToken: apiToken
    },
    json: true  
  };

  return new Promise(function(resolve, reject) {
    request.get(options, function(err, resp, body) {
      if (err) {
        reject(err);
      } else if (body) {
        resolve(body);
      } else {
        resolve({ "message" : `unable to get albums from ${options.url}` });
      }
    });
  });
}

let expiredAlbums = [];
let orphanedAlbums = [];
async function findExpiredAlbums() {
  const allAlbums = await getAllAlbums();
  for (let i = 0; i < allAlbums.length; i++) {
    const album = allAlbums[i];
    console.log("Checking album ID: " + album.appleAlbumID);

    // check if the apple album ID is still current
    const appleResponse = await getAppleAlbumData(album.appleAlbumID);
    if (appleResponse.message === `unable to find an album with ID ${album.appleAlbumID}`) {
      // console.log("\x1b[32m%s\x1b[0m", `Found one: ${album.appleAlbumID}`);
      expiredAlbums.push(album.appleAlbumID);
    }

    // check if this album is orphaned in the database
    if (album.tags.length < 1 && album.favorites.length < 1 && album.connections.length < 1 && album.lists.length < 1) {
      orphanedAlbums.push(album.appleAlbumID);
    }
  }
  console.log("-------\nResults\n-------\nTotal expired albums: " + expiredAlbums.length);
  if (expiredAlbums.length > 0){ console.log("Expired albums: " + expiredAlbums); }
  console.log("Total orphaned albums: " + orphanedAlbums.length);
  if (orphanedAlbums.length > 0){ console.log("Orphaned albums: " + orphanedAlbums); }
}

findExpiredAlbums();