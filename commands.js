const xml = require('xmlhttprequest');

const commands = ['!random', '!commands', '!uptime', '!timestamp', '!song', '!followage'];
const broadcasterCommands = [ '!title', '!game', '!feed'];
const modCommnads = ['!poll', '!pollresult'];
let oauth;
const opts = {
    identity: {
        password: 'oauth:horrol26wxispc0fr38qlv8ep3whwr',
        client_id: 'bvn0807xr52adl1kect8l1bh2paxl6'
    }
};

module.exports = {

    executedCommand: function(command, context) {
        if (commands.includes(command)) {
            console.log(`* Executed command ${command}`);
            return command;
        } else if (broadcasterCommands.includes(command) && context.badges.broadcaster == 1) {
            console.log(`* Executed broadcaster-only command ${command}`);
            return command;
        } else if (modCommnads.includes(command) && ((context.mod == true)  || (context.badges.broadcaster == 1))) {
            console.log(`* Executed moderator-only command ${command}`);
            return command;
        }
        else module.exports.readwrite(`* Tried to execute unknow command ${command}`); // possibly wanted commands
    },


    readwrite: function(message, file = null) {
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
    },

    followage: function(userID, channelID, userName) {
        let url = `https://api.twitch.tv/helix/users/follows?from_id=${userID}&to_id=${channelID}`;
        const user = JSON.parse(module.exports.useApi('GET', url));
        if (user.data[0] != null) {
            const followDate = user.data[0].followed_at;
            const time = module.exports.msToYearsAndDays(Date.now() - Date.parse(followDate));
            return `${userName} has been following for ${time}`;
        } else {
            return `${userName} isn't following this channel`;
        }
    },

    getSong: function() {
        const execSync = require('child_process').execSync;
        // get current song from cmus with bash script calling cmus-remote
        const exec = execSync('sh currentsong.sh');
    },

    setOauth: function(auth) {
        oauth = auth;
    },

    updateChannel: function(property, value, id) {
        const url = `https://api.twitch.tv/v5/channels/${id}`;
        const headers = ['Client-ID',opts.identity.client_id, 'Accept', 'application/vnd.twitchtv.v5+json',
                         'Authorization', `OAuth ${oauth}`, 'Content-Type', 'application/json;charset=utf-8'];
        const jsonString = `{"channel": {"${property}": "${value}"}}`;
        module.exports.useApi('PUT', url, false, headers, jsonString);
    },

    getCommands: function() {
        return `Commands for regular users: ${commands.join(', ')}`;
    },

    msToYearsAndDays: function(milliseconds) {
        const dayMs = 1000 * 60 * 60 * 24;
        const yearMs = dayMs * 365;
        const timeYears = Math.floor(milliseconds / yearMs);
        const timeDays = Math.floor((milliseconds % yearMs) / dayMs);
        return (timeYears > 0) ? `${timeYears} years and ${timeDays} days.` : `${timeDays} days.`;
    },

    msToTimestamp: function(milliseconds) {
        const msSeconds = 1000;
        const msMinutes = msSeconds * 60;
        const msHours = msMinutes * 60;
        const uptimeHours = Math.floor(milliseconds / msHours);
        const uptimeMinutes = Math.floor((milliseconds % msHours) / msMinutes);
        const uptimeSeconds = Math.floor((milliseconds % msMinutes ) / msSeconds);
        return `${uptimeHours}h${uptimeMinutes}m${uptimeSeconds}s`
    },

    random: function(range) {
        return Math.floor(Math.random() * range);
    },

    getUptime: function(startTime) {
        return Date.now() - Date.parse(startTime);
    },

    makePoll: function(title, choices, multi) {
        let jsonString = JSON.stringify({ poll: { question: title, answers: choices, priv: true, co: false, // priv = can poll only be found with url. co = commenting enabled
                                                  ma: multi, mip: false, enter_name: false,                 // ma = multiple selections per answer allowed. mip = multiple votes per ip.
                                                  has_deadline: false, only_reg: false, vpn: true }});      // vpn = can users with vpn vote

        headers = ['Content-Type' ,'application/json'];
        // response is a json string instead of an object so parse it first
        pollData = JSON.parse(module.exports.useApi('POST', 'https://api2.strawpoll.com/poll', false, headers, jsonString));
        return pollData;
    },

    getPoll: function() {
        pollResult = JSON.parse(module.exports.useApi('GET', `https://api2.strawpoll.com/poll/${pollData.poll.hash}`));
        // title followd by each option and how many votes they got
        let outcomeString = `${pollResult.poll.question} : `;
        const answers = pollResult.poll.answers;

        for (i in answers) {
            outcomeString += `'${answers[i].text}' with ${answers[i].votes} vote(s). `;
        }

        return outcomeString;
    },

    useApi: function(method, url, async = false, additionalHeaders = [], jsonItem = null) {
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
}
