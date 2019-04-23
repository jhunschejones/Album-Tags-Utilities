const requestPromise = require('request-promise');
const request = require('request');

function addToArray(arr, ele){
  if (arr.indexOf(ele) === -1) { arr.push(ele); }
}

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

async function addAlbum(album) {
  let postOptions = {
    method: 'POST',
    uri: 'http://localhost:3000/api/v1/album',
    body: {
      appleAlbumID: album.appleAlbumID,
      appleURL: album.appleURL,
      title: album.title,
      artist: album.artist,
      releaseDate: album.releaseDate,
      recordCompany: album.recordCompany,
      cover: album.cover,
      songNames: album.songNames,
      genres: album.genres
    },
    json: true // Automatically stringifies the body to JSON
  };

  return new Promise(function(resolve, reject) {
    requestPromise(postOptions)
      .then(function(body) {
        resolve(body);
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

async function addTag(data) {
  let postOptions = {
    method: 'POST',
    uri: 'http://localhost:3000/api/v1/tag',
    body: {
      album: data.album,
      tag: data.tagObject.tag,
      creator: data.tagObject.creator,
      customGenre: data.tagObject.customGenre || false
    },
    json: true // Automatically stringifies the body to JSON
  };

  return new Promise(function(resolve, reject) {
    requestPromise(postOptions)
      .then(function(body) {
        resolve(body);
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

async function addConnection(data) {
  let postOptions = {
    method: 'POST',
    uri: 'http://localhost:3000/api/v1/connection',
    body: {
      albumOne: data.albumOne,
      albumTwo: data.albumTwo,
      creator: data.creator
    },
    json: true // Automatically stringifies the body to JSON
  };

  return new Promise(function(resolve, reject) {
    requestPromise(postOptions)
      .then(function(body) {
        resolve(body);
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

async function addFavorite(data) {
  let postOptions = {
    method: 'POST',
    uri: 'http://localhost:3000/api/v1/favorite',
    body: {
      album: data.album,
      user: data.user
    },
    json: true // Automatically stringifies the body to JSON
  };

  return new Promise(function(resolve, reject) {
    requestPromise(postOptions)
      .then(function(body) {
        resolve(body);
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

async function createList(data) {
  let postOptions = {
    method: 'POST',
    uri: 'http://localhost:3000/api/v1/list',
    body: {
      user: data.user,
      displayName: data.displayName,
      title: data.title,
      isPrivate: data.isPrivate || false
    },
    json: true // Automatically stringifies the body to JSON
  };

  return new Promise(function(resolve, reject) {
    requestPromise(postOptions)
      .then(function(body) {
        resolve(body);
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

async function addToList(data) {
  let postOptions = {
    method: 'PUT',
    uri: 'http://localhost:3000/api/v1/list/' + data.listID,
    body: {
      method: "add album",
      appleAlbumID: data.album.appleAlbumID,
      appleURL: data.album.appleURL,
      title: data.album.title,
      artist: data.album.artist,
      releaseDate: data.album.releaseDate,
      recordCompany: data.album.recordCompany,
      cover: data.album.cover
    },
    json: true // Automatically stringifies the body to JSON
  };

  return new Promise(function(resolve, reject) {
    requestPromise(postOptions)
      .then(function(body) {
        resolve(body);
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

let users = [];
async function getAllLists() {
  let userLists = [];

  return new Promise(async function(resolve, reject) {
    for (let index = 0; index < users.length; index++) {
      const user = users[index];
      const lists = await getUserList(user);
      if (!lists.message) { userLists.push(lists); }
    }
    resolve(userLists);
  });
}

async function getUserList(userID) {
  const options = {
    url: 'https://www.albumtags.com/api/v1/list/user/' + userID,
    json: true  
  };

  return new Promise(function(resolve, reject) {
    request.get(options, function(err, resp, body) {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      } 
    });
  });
}

// GET DATA FROM MONGO DATABASE
let options = {
  uri: 'https://www.albumtags.com/api/v1/album',
  headers: {
    'User-Agent': 'Request-Promise'
  },
  json: true // Automatically parses the JSON string in the response
};
requestPromise(options)
  .then(async function(albums) {
    for (let index = 0; index < albums.length; index++) {
      const album = albums[index];
      let response = await addAlbum(album);
      if (response.message === "Album added!") { 
        console.log(`-----\n'${album.title}' added.`); 
      }
      else { console.log('-----\n' + response.message); }

      if (album.tagObjects) {
        for (let i = 0; i < album.tagObjects.length; i++) {
          const tagObject = album.tagObjects[i];
          let response = await addTag({
            "album": album,
            "tagObject": tagObject
          });
          if (response.message) { console.log(response.message); }
          if (response.tagObjects) { console.log(`Added tag '${tagObject.tag}' to ${album.title}.`); } 
          addToArray(users, tagObject.creator);
        }
      } 

      if (album.connectionObjects) {
        for (let i = 0; i < album.connectionObjects.length; i++) {
          const connectionObject = album.connectionObjects[i];
          let albumTwo = await getAppleAlbumData(connectionObject.appleAlbumID);
          let response = await addConnection({
            "albumOne": album,
            "albumTwo": albumTwo,
            "creator": connectionObject.creator
          });
          console.log(response.message);
          addToArray(users, connectionObject.creator);
        }
      } 

      if (album.favoritedBy) {
        for (let i = 0; i < album.favoritedBy.length; i++) {
          const user = album.favoritedBy[i];
          let response = await addFavorite({
            "album": album,
            "user": user
          });
          console.log(response.message || response);
          addToArray(users, user);
        }
      } 
    }
  }).then(async function() {
    const allUsersLists = await getAllLists();
    for (let index = 0; index < allUsersLists.length; index++) {
      const userLists = allUsersLists[index];

      for (let index = 0; index < userLists.length; index++) {
        const userList = userLists[index];
        let list = await createList({
          user: userList.user,
          displayName: userList.displayName,
          title: userList.title,
          isPrivate: userList.isPrivate || false
        })
        console.log(`-----\nList '${list.title}' created.`);
  
        for (let index = 0; index < userList.albums.length; index++) {
          let album = userList.albums[index];
          album = await getAppleAlbumData(album.appleAlbumID);
          let response = await addToList({
            listID: list.id,
            album: album
          })
          if (response.message && response.message === "This album is already in this list.") {
            console.log(`'${album.title}' is already in the '${list.title}' list.`);
          } else {
            console.log(`'${album.title}' has been added to the list '${list.title}'`);
          }
        }
      }
    }
  })
  .catch(function (err) {
    console.error(err);
  });
