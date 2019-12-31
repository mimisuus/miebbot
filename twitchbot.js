const tmi = require('tmi.js');
const xml = require('xmlhttprequest');
const commands = ['!dice', '!commands', '!uptime', '!timestamp', '!poll', '!song'];
const broadcasterCommands = [ '!title', '!game', '!feed'];
let userInfo, botInfo, oauth, song;

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
    switch(executedCommand(command[0], context)) {
        case '!dice':
            const num = rollDice();
            client.say(target, `You rolled a ${num}`);
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
        // Following 3 are only for broadcaster
        case '!title':
            updateChannel('status', msg.substring(command[0].length + 1, msg.length));
            break;
        case '!game':
                updateChannel('game', msg.substring(command[0].length + 1 , msg.length));
            break;
        case '!feed':   // turn feed off or on
                updateChannel('channel_feed_enabled', command[1]);
            break;
        case '!poll':
            command.shift(); 
            const title = command[0];
            let multi = false;
            if(command[1] == 'multi') {
                multi = true;
                command.shift();
            }
            command.shift(); // now the rest of the array is the wanted choises
            client.say(target, makePoll(title, command, multi));
            break;
        case '!song':
            getSong();
            readwrite(null, 'song.txt');
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
        if (file == 'oauth.txt') {
            // set ouath and ignore EOF char                // couldn't get variable assigning
            oauth = data.substring(0, data.length - 1);     // to work outside this scope 
        } else if (file == 'song.txt'){                     // even with callbacks
            // ignore filepath start
            song = data.substring(`file /home/miekki/music/`.length, data.length - 1);
        }
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
    }
    else if (command.charAt(0) == '!') readwrite(`* Tried to execute unknow command ${command}`); // possibly wanted commands
}

function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

function getUptime() {
    startTime = userInfo.started_at;
    return Date.now() - Date.parse(startTime);
}

function makePoll(title, choices, multi) {
    let jsonString = JSON.stringify({ 'title': title, 'options': choices , 'multi': multi});

    headers = ['Content-Type' ,'application/json'];
    pollData = useApi('PUT', 'https://strawpoll.me/api/v2/polls', true, headers, jsonString);
    return `https://strawpoll.me/${pollData.id}`;
}

function useApi(method, url, async = false, additionalHeaders = [], jsonItem = null) {
    let xmlHttp = new xml.XMLHttpRequest();
    xmlHttp.open(method, url, async);
    xmlHttp.setRequestHeader('Client-ID',opts.identity.client_id);
    for (let i = 0; i < additionalHeaders.length; i += 2) {
        xmlHttp.setRequestHeader(additionalHeaders[i], additionalHeaders[i + 1]);
    }
    xmlHttp.send(jsonItem);
    return xmlHttp.responseText; 
}

function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
    let url = 'https://api.twitch.tv/kraken/users?login=miekki';
    const params = ['Accept', `application/vnd.twitchtv.v5+json`];
    userJsonString = JSON.parse(useApi('GET', url, false, params));
    userInfo = userJsonString.users[0];
    // get oauth from file
    readwrite(null, 'oauth.txt');
    client.color("Blue");
}