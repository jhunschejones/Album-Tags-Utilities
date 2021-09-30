# This script requires both a locally running Album Tags 2 Staging (port 3000)
# and an Album Tags 3 Dev (port 4000)
require 'httparty'
require 'dotenv/load'

USER_CONVERSION_HASH = {
  "" => 1,
  "" => 2
}

@trouble_records = []
@album_tag_count = 0

def get_all_albums
  HTTParty.get("http://localhost:3000/api/v1/album",
    :body => { "apiToken": ENV["API_TOKEN"] }.to_json,
    :headers => { 'Content-Type' => 'application/json' }
  )
end

def get_list_data(list_id)
  JSON.parse(
    HTTParty.get("http://localhost:3000/api/v1/list/#{list_id}").body
  )
end

def get_favorites(user_id)
  favorites = {}
  favorites[user_id] = JSON.parse(
    HTTParty.get("http://localhost:3000/api/v1/favorite/#{user_id}").body
  )

  favorites
end

def get_all_list_ids(all_albums)
  all_lists = []
  all_albums.each do |album|
    if album["lists"].length > 0
      album["lists"].each do |list|
        all_lists.push(list["id"])
      end
    end
  end

  all_lists.sort.uniq
end

def get_all_list_data(all_list_ids)
  all_list_data = []
  all_list_ids.each do |list_id|
    all_list_data.push(get_list_data(list_id))
  end

  all_list_data
end

def get_all_user_favorites
  all_favorites = []
  USER_CONVERSION_HASH.each do |old_id, new_id|
    all_favorites.push(get_favorites(old_id))
  end

  all_favorites.compact
end

def send_album_to_AT3(album)
  # === Get or create album by apple_album_id ===
  response = HTTParty.post('http://localhost:4000/migrate/album', body: { apple_album_id: album["appleAlbumID"] })
  return @trouble_records.push(album["appleAlbumID"]) if response.code == 500

  album_id = JSON.parse(response.body)["album_id"]

  # === Filter tags down to users being migrated ===
  album["tags"] = album["tags"].select { |tag| USER_CONVERSION_HASH[tag["creator"]] }

  if album["tags"].length > 0
    # === Create tags ===
    album["tags"] = album["tags"].map do |tag|
      {
        text: tag["text"],
        user_id: USER_CONVERSION_HASH[tag["creator"]],
        custom_genre: tag["customGenre"]
      }
    end

    # === Associate tags to album ===
    album["tags"].each do |tag|
      HTTParty.post('http://localhost:4000/migrate/tag',
        body: { text: tag[:text], user_id: tag[:user_id], album_id: album_id }.to_json,
        headers: { 'Content-Type' => 'application/json' }
      )
      @album_tag_count = @album_tag_count + 1
    end
  end

  # === Filter connections down to users being migrated ===
  album["connections"] = album["connections"].select { |conn| USER_CONVERSION_HASH[conn["creator"]] }

  # === Create connections ===
  if album["connections"].length > 0
    album["connections"] = album["connections"].map do |conn|
      {
        parent_album: conn["albumOne"],
        child_album: conn["albumTwo"],
        user_id: USER_CONVERSION_HASH[conn["creator"]]
      }
    end

    album["connections"].each do |conn|
      HTTParty.post('http://localhost:4000/migrate/connection',
        body: conn.to_json,
        headers: { 'Content-Type' => 'application/json' }
      )
    end
  end
  # progress marker
  print '.'
end

def send_list_to_AT3(list_title:, user_id:, albums:)
  HTTParty.post('http://localhost:4000/migrate/list',
    body: { title: list_title, user_id: user_id, albums: albums }.to_json,
    headers: { 'Content-Type' => 'application/json' }
  )
  # progress marker
  print '.'
end

def migrate_all_albums(all_albums)
  all_albums.each do |album|
    send_album_to_AT3(album)
  end
end

def migrate_all_lists(all_lists)
  all_lists.each do |list|
    if USER_CONVERSION_HASH[list["user"]]
      send_list_to_AT3(
        list_title: list["title"],
        user_id: USER_CONVERSION_HASH[list["user"]],
        albums: list["albums"].map { |album| album["appleAlbumID"] }
      )
    end
  end
end

def migrate_all_user_favorites(all_user_favorites)
  all_user_favorites.each do |user_favorites|
    send_list_to_AT3(
      list_title: "My Favorites",
      user_id: USER_CONVERSION_HASH[user_favorites.keys[0]],
      albums: user_favorites.values[0].map { |album| album["appleAlbumID"] }
    )
  end
end

all_albums = get_all_albums
migrate_all_albums(all_albums)

# all_list_data = get_all_list_data(get_all_list_ids(all_albums))
# migrate_all_lists(all_list_data)

# all_user_favorites = get_all_user_favorites
# migrate_all_user_favorites(all_user_favorites)

# finish progress meter
puts '.'
puts "\nMigration complete!\n"
puts ''
puts "album_tag count: #{@album_tag_count}"

# report errors
puts "REPORT: there was a problem with one or more albums: #{@trouble_records.join(", ")}" if @trouble_records.length > 0
