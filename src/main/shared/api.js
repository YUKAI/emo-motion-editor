import { ipcRenderer } from 'electron';
import { settings } from './funcs';

const config = {
    baseUrl: 'https://platform-api.bocco.me',
    loginUrl: 'https://platform-api.bocco.me/oauth/login',
    authorizationUrl: 'https://platform-api.bocco.me/oauth/authorize',
    redirectUri: 'https://platform-api.bocco.me/dashboard/callback',
    termsUrl: 'https://www.bocco.me/terms',
};

var headers = {
    "accept": "*/*",
    "Content-Type": "application/json",
    "Authorization": ""
}

export const login = function() {
    return new Promise(function(resolve, reject) {
        ipcRenderer.invoke('app-window-show-api-login', config)
        .then(code => {
            var token_get_url_params = {
                code: code
            };
            var token_get_url = config.authorizationUrl + '?' + (new URLSearchParams(token_get_url_params)).toString();
            fetch(token_get_url).then(res => {
                if (!res.ok) {
                    res.json().then(d => {
                        reject(d);
                    });
                }
                else {
                    res.json().then(d => {
                        headers["Authorization"] = "Bearer " + d.access_token;
                        settings.set("api.access_token", d.access_token);
                        settings.set("api.refresh_token", d.refresh_token);
                        resolve();
                    });
                }
            });
        })
        .catch(error => {
            var i = error.message.indexOf(':');
            const short_msg = error.message.substring(i > 0 ? i+2 : i);
            reject(short_msg);
        });
    });
}

async function _update_tokens() {
    var req = config.baseUrl+"/oauth/token/refresh";
    var res = await fetch(req, {
        method: "POST",
        headers: {
            "accept": "*/*",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({"refresh_token": settings.get("api.refresh_token")})
    });
    var d = await res.json();
    if (!res.ok) {
        throw d;
    }
    headers["Authorization"] = "Bearer " + d.access_token;
    settings.set("api.access_token", d.access_token);
    settings.set("api.refresh_token", d.refresh_token);
}

async function _get(path, params=null, update=true) {
    var url_params = "";
    if (params) {
        url_params = '?' + (new URLSearchParams(params)).toString();
    }
    var req = config.baseUrl+path+url_params;
    if (!headers["Authorization"]) {
        headers["Authorization"] = "Bearer " + settings.get("api.access_token");
    }
    var res = await fetch(req, {
        method: "GET",
        headers: headers
    });
    if (update  &&  res.status == 401) {
        try {
            await _update_tokens();
            return await _get(path, params, false);
        }
        catch (error) {
            throw error;
        }
    }
    var d = await res.json();
    if (!res.ok) {
        throw d;
    }
    return d;
}

async function _post(path, data, update=true) {
    var req = config.baseUrl+path;
    if (!headers["Authorization"]) {
        headers["Authorization"] = "Bearer " + settings.get("api.access_token");
    }
    var res = await fetch(req, {
        method: "POST",
        headers: headers,
        body: data
    });
    if (update  &&  res.status == 401) {
        try {
            await _update_tokens();
            return await _post(path, data, false);
        }
        catch (error) {
            throw error;
        }
    }
    var d = await res.json();
    if (!res.ok) {
        throw d;
    }
    return d;
}

export const get_account_info = async function() {
    try {
        var d = await _get("/v1/me");
        return d;
    }
    catch (error) {
        throw error;
    }
}

export const get_rooms_list = async function() {
    try {
        var d = await _get("/v1/rooms");
        return d;
    }
    catch (error) {
        throw error;
    }
}

export const send_motion = async function(room, motion) {
    try {
        var d = await _post("/v1/rooms/"+room+"/motions", JSON.stringify(motion));
        return d;
    }
    catch (error) {
        throw error;
    }
}
