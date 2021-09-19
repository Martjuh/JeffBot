require('dotenv').config();
const YOUTUBE_API_KEY = process.env.GOOGLE_API_KEY;
const axios = require('axios');

async function search(query){
    query = query.split(' ').join('_');
    console.log(query);
    const url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&type=video&part=snippet&q=${query}`;
    const response = axios.get(url);
    return response;
}

module.exports = {
    search,
};
