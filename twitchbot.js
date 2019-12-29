const tmi = require('tmi.js');
const xml = require('xmlhttprequest')
const commands = ['!dice', '!commands', '!uptime', '!timestamp', '!song', '!poll', '!title', '!game', '!feed'];
let userInfo;

const opts = {
    options: { debug: true},
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: 'miebbot',
        password: 'oauth:horrol26wxispc0fr38qlv8ep3whwr'
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
    switch(executedCommand(command[0])) {
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
            log(`Timestamp at ${timestamp}`);
            break;
        // MAKE THE FOLLOWING 3 FOR MODERATORS ONLY
        case '!title':
            updateChannel('status', msg.substring(command[0].length , msg.length - 1))
            break;
        case '!game':
            updateChannel('game', msg.substring(command[0].length , msg.length - 1))
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
            break;
    }
}

function updateChannel(property, value) {
    const url = 'https://api.twitch.tv/kraken/channels/' + userInfo.id; 
    const headers = [`Authorization: Bearer ${opts.identity.password}`, 'Content-Type' ,'application/json'];
    const jsonString = `{"channel": {"${property}": "${value}"}}`;
    useApi('PUT', url, true, headers, jsonString);
}

function log(message) {
    const fs = require('fs');
    fs.appendFile('logs.txt', message + "\n", function(err){
        if (err) throw err;
        console.log('* Logs updated');
    });
}

function msToTimestamp(milliseconds) {
    const uptimeHours = Math.floor(milliseconds / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const uptimeSeconds = Math.floor((milliseconds % (1000 * 60) )/ (1000));
    return `${uptimeHours}h${uptimeMinutes}m${uptimeSeconds}s`
}

function executedCommand(command) {
    if (commands.includes(command)) {
        console.log(`* Executed command ${command}`);
        return command;
    } 
    else if (command.charAt(0) == '!') log(`* Tried to execute unknow command ${command}`); // possibly wanted commands
}

function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

function getUptime() {
    startTime = userInfo.started_at;
    return Date.now() - Date.parse(startTime);
}

function makePoll(title, choices, multi) {
    let jsonString = 
    `{"title": "${title}",` +               // "title": "X",
    `"options": [`+                         // "options": [
    '"' + choices.join('", "') + '"' +   //      "Option #1", "Option #2", "Option #3"...
    `],`+                                   // ],
    `"multi": ${multi}}`;                   // "multi": true/false

    headers = ['Content-Type' ,'application/json'];
    pollData = useApi('PUT', 'https://strawpoll.me/api/v2/polls', true, headers, jsonString);
    return `https://strawpoll.me/${pollData.id}`;
}

function useApi(method, url, async = false, additionalHeaders = [], jsonItem = null) {
    let xmlHttp = new xml.XMLHttpRequest();
    xmlHttp.open( method, url, async);
    // never used with PUT
    if (method == 'GET') xmlHttp.setRequestHeader('Client-ID','bvn0807xr52adl1kect8l1bh2paxl6');
    for (let i = 0; i < additionalHeaders.length; i += 2) {
        xmlHttp.setRequestHeader(additionalHeaders[i], additionalHeaders[i + 1]);
    }
    xmlHttp.send(jsonItem);
    return xmlHttp.responseText; 
}

function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
    const url = 'https://api.twitch.tv/helix/streams?user_login=miekki';
    const userJSON = JSON.parse(useApi('GET', url));
    userInfo = userJSON.data[0];
}
