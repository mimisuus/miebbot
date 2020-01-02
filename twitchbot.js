const tmi = require('tmi.js');
const commands = require('./commands')
let userInfo, botInfo, oauth, pollData;

const opts = {
    options: { debug: true},
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: 'miebbot',
        password: 'oauth:horrol26wxispc0fr38qlv8ep3whwr',
        client_id: 'bvn0807xr52adl1kect8l1bh2paxl6'
    },
    channels: [ 'miekki' ]
};

const client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

client.connect();

function onMessageHandler(target, context, msg, self) {
    if (self) { return; } // ignore all messages from the bot itself

    let commandComponents = msg.split(' ');
    switch (commands.executedCommand(commandComponents[0], context)) {
        case '!random':
            const range = commandComponents[1];
            if (range == null) {
                client.say(target, 'Please specify an upper limit for the random number');
            } else {
                const num = commands.random(range);
                client.say(target, `Result: ${num}`);
            }
            break;
        case '!commands':
            client.say(target, commands.getCommands());
            break;
        case '!uptime':
            if (userInfo.started_at != null) {
                client.say(target, `Stream has been live for ${commands.msToTimestamp(commands.getUptime(userInfo.started_at))}`);
            } else {
                client.say(target, `Stream is currently offline`);
            }
            break;
        case '!timestamp': // for finding highlights with ease after the stream is over
            if (userInfo.started_at != null) {
                const timestamp = commands.msToTimestamp(commands.getUptime(userInfo.started_at));
                client.say(target, `Timestamp saved at ${timestamp}`)
                commands.readwrite(`Timestamp at ${timestamp}`);
            } else {
                client.say(target, `Stream is currently offline`);
            }
            break;
        case '!song':
            commands.getSong();
            let song = commands.readwrite(null, 'song.txt');
            // ignore filepath start, filenames are orignally in format "artist_song_name" 
            song = song.substring(`file /home/miekki/music/`.length, song.length - 1).replace(/_/g,' ');
            // FIX CHECKING EMPTYNESS
            if (song != ' ') {
                client.say(target, `Currently playing: ${song}`);
            } else {
                client.say(target, `Current song isn't from usual playlist`);
                console.log('* current song unavailable');
            }
            break;    
        // Next 3 are only for broadcaster
        case '!title':
            commands.updateChannel('status', msg.substring(commandComponents[0].length + 1, msg.length), userInfo._id);
            break;
        case '!game':
            let gameName = msg.substring(commandComponents[0].length + 1 , msg.length);
            // get rid of the need to properly format game name for users most streamed games
            switch (gameName) {
                case 'isaac':
                    gameName = 'The Binding of Isaac: Afterbirth';
                    break;
                case 'csgo':
                    gameName = 'Counter-Strike: Global Offensive';
                    break;
            }
            commands.updateChannel('game', gameName, userInfo._id);
            break;
        case '!feed':   // turn feed off or on
            commands.updateChannel('channel_feed_enabled', commandComponents[1], userInfo._id);
            break;
        // Last 2 are only for channel moderatros & broadcaster 
        case '!poll':
            pollArgs = msg.split(`|`);
            pollArgs[0] = pollArgs[0].substring(`!poll `.length, pollArgs[0].length);
            const title = pollArgs[0];
            let multi = false;
            if (pollArgs[1] == 'multi') {
                multi = true;
                pollArgs.shift();
            }
            pollArgs.shift(); // now the rest of the array is the wanted choises
            if (pollArgs.length < 2) {
                client.say(target, `provide a title, and atleast 2 options in the format '!poll title|option1|option2' and an optional 'multi' flag after the title`);
            } else {
                pollData = commands.makePoll(title, pollArgs, multi);
                client.say(target, `https://strawpoll.com/${pollData.poll.hash}`);
            }
            break;
        case '!pollresult':
            if (pollData != null) {
                pollResult = commands.getPoll();
                client.say(target, pollResult);
            } else {
                client.say(target, 'No data available for past polls');
            }
            break;
    }
}

function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
    // get basic information from broadcaster such as user-id 
    let url = 'https://api.twitch.tv/kraken/users?login=miekki';
    const params = ['Accept', `application/vnd.twitchtv.v5+json`];
    userJsonString = JSON.parse(commands.useApi('GET', url, false, params));
    userInfo = userJsonString.users[0];
    // set ouath and ignore EOF char  
    let oauth = commands.readwrite(null, 'oauth.txt')
    commands.setOauth(oauth.substring(0, oauth.length - 1));
    // bot's name color in chat
    client.color("Blue");
}