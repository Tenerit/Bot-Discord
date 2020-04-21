require('dotenv').config();

let API = require('./modules/api.js');

const Discord = require('discord.js');
const client = new Discord.Client();

let countries = [];


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (!msg.content.startsWith('!covid')) {
        return;
    }

    switch (getWordAtIndex(msg, 1)) {
        case "help":
            help(msg);
            break;
        case "copy":
            copytext(msg);
            break;
        case "country":
            totalCountry(msg);
            break;
        case "clean":
            cleaner(msg,50);
            break;
        case "info":
            checkOnline(msg);
            break;
        case "world":
            world(msg);
            break;
    }
});


function help(msg)
{
    const embedAnswer = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle(':bell: CoronaBot :bell: ') // l'autre est plus laide
        .setAuthor('CoronaBot', 'https://france3-regions.francetvinfo.fr/bretagne/sites/regions_france3/files/styles/top_big/public/assets/images/2020/03/12/covid19-4689908.jpg?itok=pyE-DiY7', '')
        .setDescription('Liste Des Commandes')
        .setThumbnail('https://france3-regions.francetvinfo.fr/bretagne/sites/regions_france3/files/styles/top_big/public/assets/images/2020/03/12/covid19-4689908.jpg?itok=pyE-DiY7')
        .addFields(
        { name: 'Total for a Country', value: '!covid country {country}' },
        { name : 'Check The Service Status', value :'!covid info'},
        { name : 'Total for the world', value : '!covid world'}
        ) 
        .setFooter('Copyright CoronaBot', 'https://france3-regions.francetvinfo.fr/bretagne/sites/regions_france3/files/styles/top_big/public/assets/images/2020/03/12/covid19-4689908.jpg?itok=pyE-DiY7');

    msg.channel.send(embedAnswer);
}

async function cleaner(msg,amount)
{
    await msg.channel.messages.fetch({ limit: amount }).then(messages => { // Fetches the messages
        msg.channel.bulkDelete(messages // Bulk deletes all messages that have been fetched and are not older than 14 days (due to the Discord API)
    )});
}
function copytext(msg)
{
    let newtwit = msg.content.slice(11);

    if(msg.content.length > 2)
    {
        const embedAnswer = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle(':bell: CoronaBot Actus :bell: ') // l'autre est plus laide
        .setAuthor('CoronaBot', 'https://france3-regions.francetvinfo.fr/bretagne/sites/regions_france3/files/styles/top_big/public/assets/images/2020/03/12/covid19-4689908.jpg?itok=pyE-DiY7', '')
        .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Flag_of_France.png/320px-Flag_of_France.png')
        .addFields(
            { name: 'Actualité du Gouvernement', value: newtwit })

        let channel = msg.guild.channels.cache.get("701700082700910677");

        if (channel) {
            channel.send(embedAnswer);
        }
    }

}

function checkOnline(msg)
{
    let data = API('/stats');
    const embedMessage = new Discord.MessageEmbed();

    if (!data || data.length === 0) {
        embedMessage.setColor('#951F0F')
            .setTitle('CoronaBot Service')
            .setDescription(':red_cross:');
    } else {
        embedMessage.setColor('#3FAB13')
            .setTitle('CoronaBot Service')
            .setDescription(':white_check_mark:');
    }

    msg.channel.send(embedMessage); 
}

async function getAllCountries()
{
    if (countries && countries.length > 0) {
        return countries;
    }

    let data = await API("/countries");

    if (!data || data.length === 0) {
        return [];
    }

    if (!Array.isArray(data) && typeof data === "object") {
        data = [data];
    }

    countries = data.map(obj => { return {"name": obj.Country.toLowerCase(), "slug": obj.Slug} });
    
    return countries;
}

async function getClosestCountryName(name) {
    await getAllCountries();

    let minimalSlug = "";
    let minimalName = "";
    let minimalDistance = Number.MAX_SAFE_INTEGER;

    for (let country of countries) {
        let distance = levenshteinDistance(country.name, name);

        if (distance === 0) {
            return {slug: country.slug, name: country.name};
        }

        if (distance < minimalDistance) {
            minimalDistance = distance;
            minimalName = country.name;
            minimalSlug = country.slug;
        }
    }

    return {slug: minimalSlug, name: minimalName};
}

async function totalCountry(msg) {
    const userCountry = getAfterWordIndex(msg, 2);
    const closestCountry = await getClosestCountryName(userCountry);

    let today = new Date();

    let yesterdayEarly = new Date();
    yesterdayEarly.setDate(today.getDate() - 1);
    yesterdayEarly.setUTCHours(0, 0, 0, 0);
    let yesterdayLate = new Date();
    yesterdayLate.setDate(today.getDate() - 1);
    yesterdayLate.setUTCHours(0, 0, 0, 1);

    const path = `/live/country/${closestCountry.slug}/status/confirmed?from=${yesterdayEarly.toISOString()}&to=${yesterdayLate.toISOString()}`;
    
    API(path).then((data) => {
        if (!data || data.length === 0) {
            return;
        }

        let death = 0;
        let confirmed = 0;
        let recovered = 0;
        let active = 0;

        data.forEach(obj => {
            death += obj['Deaths'] || 0;
            confirmed += obj['Confirmed'] || 0;
            recovered += obj['Recovered'] || 0; 
            active += obj['Active'] || 0;
        });

        const Msg = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Total ' + closestCountry.name)
            .setAuthor('CoronaBot', 'https://france3-regions.francetvinfo.fr/bretagne/sites/regions_france3/files/styles/top_big/public/assets/images/2020/03/12/covid19-4689908.jpg?itok=pyE-DiY7', '')
            .setDescription('Statistiques Globales '+ closestCountry.name)
            .setThumbnail('https://france3-regions.francetvinfo.fr/bretagne/sites/regions_france3/files/styles/top_big/public/assets/images/2020/03/12/covid19-4689908.jpg?itok=pyE-DiY7')
            .addFields(
            { name: 'Deaths', value: death },
            { name: 'Confirmed', value: confirmed },
            { name: 'Recovered', value: recovered },
            { name: 'Active', value: active},
            ) 
            .setFooter('Copyright CoronaBot', 'https://france3-regions.francetvinfo.fr/bretagne/sites/regions_france3/files/styles/top_big/public/assets/images/2020/03/12/covid19-4689908.jpg?itok=pyE-DiY7');

        msg.channel.send(Msg);
        console.log(path);
    })
}

function world(msg) {
    const path = `/world/total`;
    
    API(path).then((data) => {
        if (!data || data.length === 0) {
            return;
        }

        const Msg = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Total World')
            .setAuthor('CoronaBot', 'https://france3-regions.francetvinfo.fr/bretagne/sites/regions_france3/files/styles/top_big/public/assets/images/2020/03/12/covid19-4689908.jpg?itok=pyE-DiY7', '')
            .setDescription('Statistiques Globales du Monde')
            .setThumbnail('https://france3-regions.francetvinfo.fr/bretagne/sites/regions_france3/files/styles/top_big/public/assets/images/2020/03/12/covid19-4689908.jpg?itok=pyE-DiY7')
            .addFields(
            { name: 'Deaths', value: data["TotalDeaths"] },
            { name: 'Confirmed', value: data["TotalConfirmed"] },
            { name: 'Recovered', value: data["TotalRecovered"] },
            { name: 'Active', value: data["TotalConfirmed"] - (data["TotalRecovered"] + data["TotalDeaths"]) },
            ) 
            .setFooter('Copyright CoronaBot', 'https://france3-regions.francetvinfo.fr/bretagne/sites/regions_france3/files/styles/top_big/public/assets/images/2020/03/12/covid19-4689908.jpg?itok=pyE-DiY7');

        msg.channel.send(Msg);
    })
}

function getWordAtIndex(msg, index) {
    let content = msg.content.split(' ');
    if (index >= content.length) {
        return "";
    }

    return content[index].trim().toLowerCase();
}

function getAfterWordIndex(msg, index) {
    let content = msg.content.split(' ');
    if (index >= content.length) {
        return "";
    }
    content.splice(0, index);
    return content.join(' ').trim().toLowerCase();
}


//https://gist.github.com/andrei-m/982927
function levenshteinDistance(a, b) {
    if(a.length == 0) return b.length; 
  if(b.length == 0) return a.length;

  if(a.length > b.length) {
    var tmp = a;
    a = b;
    b = tmp;
  }

  var row = [];
  for(var i = 0; i <= a.length; i++){
    row[i] = i;
  }

  for(var i = 1; i <= b.length; i++){
    var prev = i;
    for(var j = 1; j <= a.length; j++){
      var val;
      if(b.charAt(i-1) == a.charAt(j-1)){
        val = row[j-1];
      } else {
        val = Math.min(row[j-1] + 1,
                       prev + 1,
                       row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[a.length] = prev;
  }

  return row[a.length];
}

client.login(process.env.DISCORD_API_KEY);