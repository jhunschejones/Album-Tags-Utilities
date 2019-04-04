require 'httparty'
require 'dotenv/load'

results = HTTParty.get("http://localhost:3000/api/v1/album",
  :body => { "apiToken": ENV["API_TOKEN"] }.to_json,
  :headers => { 'Content-Type' => 'application/json' } )

def keywords(string)
  words = []
  notwords = ["AND","THE","OR","OF","A",""]
  string.split.each do |word|
    words.push(word) if !notwords.include?(word)
  end
  words.join(" ")
end

duplicate_records = []
all_records = []

results.each do |result|
  artist = keywords(result["artist"].upcase)
  title = keywords(result["title"].upcase)
  apple_album_id = result["appleAlbumID"].to_i
  album = { artist: artist, title: title, apple_album_id: apple_album_id }

  duplicates = all_records.select{|record| 
    record[:artist] == artist && record[:title] == title
  }
  duplicate_records.push(album, duplicates) if !duplicates.empty?

  all_records.push(album)
  # puts "Checking #{result["title"]} by #{result["artist"]}"
end

puts "------\nChecked #{all_records.length} albums successfully!\nDuplicate albums: #{duplicate_records.length}"
puts duplicate_records.flatten
