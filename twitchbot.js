const tmi = require('tmi.js');
const xml = require('xmlhttprequest');
const commands = ['!random', '!commands', '!uptime', '!timestamp', '!song'];
const broadcasterCommands = [ '!title', '!game', '!feed'];
const modCommnads = ['!poll'];
let userInfo, botInfo, oauth;

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

    let command = msg.split(' ');
    switch (executedCommand(command[0], context)) {
        case '!random':
            const range = command[1];
            if (range == null) {
                client.say(target, 'Please specify an upper limit for the random number');
            } else {
                const num = random(range);
                client.say(target, `Result: ${num}`);
            }
            break;
        case '!commands':
            commandsStr = commands.join(', ');
            client.say(target, commandsStr);
            break;
        case '!uptime':
            client.say(target, `Stream has been live for ${msToTimestamp(getUptime())}`);
            break;
        case '!timestamp': // for finding highlights with ease after the stream is over
            const timestamp = msToTimestamp(getUptime());
            client.say(target, `Timestamp saved at ${timestamp}`)
            readwrite(`Timestamp at ${timestamp}`);
            break;
        // Following 4 are only for broadcaster
        case '!title':
            updateChannel('status', msg.substring(command[0].length + 1, msg.length));
            break;
        case '!game':
            let gameName = msg.substring(command[0].length + 1 , msg.length);
            // get rid of the need to properly format game name for users most streamed games
            switch (gameName) {
                case 'isaac':
                    gameName = 'The Binding of Isaac: Afterbirth';
                    break;
                case 'csgo':
                    gameName = 'Counter-Strike: Global Offensive';
                    break;
            }
            updateChannel('game', gameName);
            break;
        case '!feed':   // turn feed off or on
            updateChannel('channel_feed_enabled', command[1]);
            break;
        case '!poll':
            command.shift(); 
            const title = command[0];
            let multi = false;
            if (command[1] == 'multi') {
                multi = true;
                command.shift();
            }
            command.shift(); // now the rest of the array is the wanted choises
            if (command.lenght < 2) {
                client.say(target, `provide a title, and atleast 2 options in the format 'title option1 option2' and an optional 'multi' flag after the title`);
            } else {
                client.say(target, makePoll(title, command, multi));
            }
            break;
        case '!song':
            getSong();
            let song = readwrite(null, 'song.txt');
            // ignore filepath start, filenames are orignally in format "artist_song_name" 
            song = song.substring(`file /home/miekki/music/`.length, song.length - 1).replace(/_/g,' ');
            client.say(target, `Currently playing: ${song}`);
            break;
    }
}

function getSong() {
    const execSync = require('child_process').execSync;
    // get current song from cmus with bash script calling cmus-remote
    const exec = execSync('sh currentsong.sh');
}

function updateChannel(property, value) {
    const url = `https://api.twitch.tv/v5/channels/${userInfo._id}`;
    const headers = ['Client-ID',opts.identity.client_id, 'Accept', 'application/vnd.twitchtv.v5+json',
                     'Authorization', `OAuth ${oauth}`, 'Content-Type', 'application/json;charset=utf-8'];
    const jsonString = `{"channel": {"${property}": "${value}"}}`;
    useApi('PUT', url, false, headers, jsonString);
}

function readwrite(message, file = null) {
    const fs = require('fs');
    if (message != null) {
        fs.appendFile('logs.txt', message + "\n", function(err){
            if (err) throw err;
            console.log('* Logs updated');
        });
    } else {
        var data = fs.readFileSync(file,{ encoding: 'utf8'});
        return data;
    }
}

function msToTimestamp(milliseconds) {
    const uptimeHours = Math.floor(milliseconds / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const uptimeSeconds = Math.floor((milliseconds % (1000 * 60) )/ (1000));
    return `${uptimeHours}h${uptimeMinutes}m${uptimeSeconds}s`
}

function executedCommand(command, context) {
    if (commands.includes(command)) {
        console.log(`* Executed command ${command}`);
        return command;
    } else if (broadcasterCommands.includes(command) && context.badges.broadcaster == 1) {
        console.log(`* Executed broadcaster-only command ${command}`);
        return command;
    } else if (modCommnads.includes(commands) && ((context.mod == true)  || (context.badges.broadcaster == 1))) {
        console.log(`* Executed moderator-only command ${command}`);
        return command;
    }
    else if (command.charAt(0) == '!') readwrite(`* Tried to execute unknow command ${command}`); // possibly wanted commands
}

function random(range) {
    return Math.floor(Math.random() * range);
}

function getUptime() {
    startTime = userInfo.started_at;
    return Date.now() - Date.parse(startTime);
}

function makePoll(title, choices, multi) {
    let jsonString = JSON.stringify({ poll: { question: title, answers: choices, priv: true, co: false, // priv = can poll only be found with url. co = commenting enabled
                                              ma: multi, mip: false, enter_name: false,                 // ma = multiple selections per answer allowed. mip = multiple votes per ip.
                                              has_deadline: false, only_reg: false, vpn: true }});      // vpn = can users with vpn vote

    headers = ['Content-Type' ,'application/json'];
    // response is a json string instead of an object so parse it first
    pollData = JSON.parse(useApi('POST', 'https://api2.strawpoll.com/poll', false, headers, jsonString));
    return `https://strawpoll.com/${pollData.poll.hash}`;
}

function useApi(method, url, async = false, additionalHeaders = [], jsonItem = null) {
    let xmlHttp = new xml.XMLHttpRequest();
    xmlHttp.open(method, url, async);
    // used in almost every twitch api call
    xmlHttp.setRequestHeader('Client-ID',opts.identity.client_id);
    for (let i = 0; i < additionalHeaders.length; i += 2) {
        xmlHttp.setRequestHeader(additionalHeaders[i], additionalHeaders[i + 1]);
    }
    xmlHttp.onload = function () {
        console.log(xmlHttp.status)
    }
    xmlHttp.send(jsonItem);
    return xmlHttp.responseText; 
}

function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
    // get basic information from broadcaster such as user-id 
    let url = 'https://api.twitch.tv/kraken/users?login=miekki';
    const params = ['Accept', `application/vnd.twitchtv.v5+json`];
    userJsonString = JSON.parse(useApi('GET', url, false, params));
    userInfo = userJsonString.users[0];
    // set ouath and ignore EOF char  
    oauth = readwrite(null, 'oauth.txt')
    oauth = oauth.substring(0, oauth.length - 1);
    // bot's name color in chat
    client.color("Blue");
}