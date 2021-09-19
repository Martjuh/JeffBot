require('dotenv').config();
const { Client, Intents } = require('discord.js');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const ytsearch = require('./ytsearch');
const ytdl = require('ytdl-core')
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    StreamType
} = require('@discordjs/voice');

// Set the prefix
const prefix = "<>";

// Music Queue
const queue = new Map()

//
const yt_opts = {
    maxResults: 10,
    key: "AIzaSyA9BbnOg-cDM1Kl58EEIoqQow_pzKAUn3s"
}

// Log on message
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", (message) => {
    const serverQueue = queue.get(message.guild.id);

    // Exit and stop if it's not there
    if (!message.content.startsWith(prefix)) return;

    if (message.content.startsWith(prefix + "ping")) {
        message.channel.send("pong!");
    } else
    if (message.content.startsWith(prefix + "foo")) {
        message.channel.send("bar!");
    }
    if (message.content.startsWith(prefix + "m")) {
        let msg;
        msg = message.content.split(" ");
        if (msg[1] === 'play') {
            if (msg.length > 2){
                query = msg.slice(2).join(" ");
                execute(message, serverQueue, query);
            }
        }
    }
});

async function execute(message, serverQueue, songquery) {
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
            "You need to be in a voice channel to play music!"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "I need the permissions to join and speak in your voice channel!"
        );
    }

    const search = await ytsearch.search(songquery);
    const songInfo = await ytdl.getInfo(search.data.items[0].id.videoId);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        try {
            var connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
                selfDeaf: false
            })
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0], connection);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} has been added to the queue!`);
    }
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "You have to be in a voice channel to stop the music!"
        );
    if (!serverQueue)
        return message.channel.send("There is no song that I could skip!");
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "You have to be in a voice channel to stop the music!"
        );

    if (!serverQueue)
        return message.channel.send("There is no song that I could stop!");

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

async function play(guild, song, connection) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    const player = createAudioPlayer()
        .on("idle", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    console.log(song.url);
    const stream = ytdl(song.url, {filter:'audioonly', highWaterMark: 1 << 25, });
    const resource = createAudioResource(stream, {inputType: StreamType.Arbitrary,});
    player.play(resource);
    connection.subscribe(player);
    serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

client.login(process.env.BOT_TOKEN);