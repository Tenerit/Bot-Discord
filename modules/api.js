let rp = require('request-promise')

function API(param)
{
    let route = 'https://api.covid19api.com' + param;

    return rp.get({
        url: route,
        json: true,
    }).catch((err) => {
        console.error("Error during api call with parameter [" + param + "]");
    });
}

module.exports = API;