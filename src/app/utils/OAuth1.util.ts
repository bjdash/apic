import Base64 from 'crypto-js/enc-base64';
import HmacSHA1 from 'crypto-js/hmac-sha1';
import HmacSHA256 from 'crypto-js/hmac-sha256';
import { Utils } from '../services/utils.service';

export class OAuth1Util {
    static sign(message, accessor: { consumerSecret: string, tokenSecret: string }, method: string) {
        var baseString = this.getBaseString(message);
        let key = this.getKey(accessor)
        var signature = this.getSignature(baseString, key, method);
        message.parameters.push(['oauth_signature', signature]);
        return signature;
    }

    static getBaseString(message) {
        var URL = message.action;
        var q = URL.indexOf('?');
        var parameters;
        if (q < 0) {
            parameters = message.parameters;
        } else {
            // Combine the URL query string with the other parameters:
            parameters = this.decodeForm(URL.substring(q + 1));
            var toAdd = this.getParameterList(message.parameters);
            for (var a = 0; a < toAdd.length; ++a) {
                parameters.push(toAdd[a]);
            }
        }
        return this.percentEncode(message.method.toUpperCase())
            + '&' + this.percentEncode(this.normalizeUrl(URL))
            + '&' + this.percentEncode(this.normalizeParameters(parameters));
    }

    static getSignature(baseString, key, method) {
        switch (method) {
            case 'HMAC-SHA1':
                return Base64.stringify(HmacSHA1(baseString, key));
            case 'HMAC-SHA256':
                return Base64.stringify(HmacSHA256(baseString, key));
            case 'PLAINTEXT':
                return key;
        }
    }

    static getKey(accessor: { consumerSecret: string, tokenSecret: string }) {
        return this.percentEncode(accessor.consumerSecret) + "&" + this.percentEncode(accessor.tokenSecret);
    }

    static decodeForm(form) {
        var list = [];
        var nvps = form.split('&');
        for (var n = 0; n < nvps.length; ++n) {
            var nvp = nvps[n];
            if (nvp == "") {
                continue;
            }
            var equals = nvp.indexOf('=');
            var name;
            var value;
            if (equals < 0) {
                name = this.decodePercent(nvp);
                value = null;
            } else {
                name = this.decodePercent(nvp.substring(0, equals));
                value = this.decodePercent(nvp.substring(equals + 1));
            }
            list.push([name, value]);
        }
        return list;
    }

    static decodePercent(s) {
        if (s != null) {
            // Handle application/x-www-form-urlencoded, which is defined by
            // http://www.w3.org/TR/html4/interact/forms.html#h-17.13.4.1
            s = s.replace(/\+/g, " ");
        }
        return decodeURIComponent(s);
    }

    static getParameterList(parameters) {
        if (parameters == null) {
            return [];
        }
        if (typeof parameters != "object") {
            return this.decodeForm(parameters + "");
        }
        if (parameters instanceof Array) {
            return parameters;
        }
        var list = [];
        for (var p in parameters) {
            list.push([p, parameters[p]]);
        }
        return list;
    }

    static percentEncode(s) {
        if (s == null) {
            return "";
        }
        if (s instanceof Array) {
            var e = "";
            for (var i = 0; i < s.length; ++i) {
                if (e != "") e += '&';
                e += this.percentEncode(s[i]);
            }
            return e;
        }
        s = encodeURIComponent(s);
        // Now replace the values which encodeURIComponent doesn't do
        // encodeURIComponent ignores: - _ . ! ~ * ' ( )
        // OAuth dictates the only ones you can ignore are: - _ . ~
        // Source: http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Functions:encodeURIComponent
        s = s.replace(/\!/g, "%21");
        s = s.replace(/\*/g, "%2A");
        s = s.replace(/\'/g, "%27");
        s = s.replace(/\(/g, "%28");
        s = s.replace(/\)/g, "%29");
        return s;
    }

    static normalizeUrl(url) {
        var uri: any = Utils.parseUri(url);
        var scheme = uri.protocol.toLowerCase();
        var authority = uri.authority.toLowerCase();
        var dropPort = (scheme == "http" && uri.port == 80)
            || (scheme == "https" && uri.port == 443);
        if (dropPort) {
            // find the last : in the authority
            var index = authority.lastIndexOf(":");
            if (index >= 0) {
                authority = authority.substring(0, index);
            }
        }
        var path = uri.path;
        if (!path) {
            path = "/"; // conforms to RFC 2616 section 3.2.2
        }
        // we know that there is no query and no fragment here.
        return scheme + "://" + authority + path;
    }

    static normalizeParameters(parameters) {
        if (parameters == null) {
            return "";
        }
        var list = this.getParameterList(parameters);
        var sortable = [];
        for (var p = 0; p < list.length; ++p) {
            var nvp = list[p];
            if (nvp[0] != "oauth_signature") {
                sortable.push([this.percentEncode(nvp[0])
                    + " " // because it comes before any character that can appear in a percentEncoded string.
                    + this.percentEncode(nvp[1])
                    , nvp]);
            }
        }
        sortable.sort(function (a, b) {
            if (a[0] < b[0]) return -1;
            if (a[0] > b[0]) return 1;
            return 0;
        });
        var sorted = [];
        for (var s = 0; s < sortable.length; ++s) {
            sorted.push(sortable[s][1]);
        }
        return this.formEncode(sorted);
    }

    static formEncode(parameters) {
        var form = "";
        var list = this.getParameterList(parameters);
        for (var p = 0; p < list.length; ++p) {
            var value = list[p][1];
            if (value == null) value = "";
            if (form != "") form += '&';
            form += this.percentEncode(list[p][0])
                + '=' + this.percentEncode(value);
        }
        return form;
    }
}