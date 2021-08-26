import { Utils } from "../services/utils.service";
import crypto from 'crypto-js/core';
import Base64 from 'crypto-js/enc-base64';

export class HawkAuthUtil {
    static header(uri, method, options) {
        if (!uri || (typeof uri !== 'string' && typeof uri !== 'object') ||
            !method || typeof method !== 'string' ||
            !options || typeof options !== 'object') {

            throw new Error('Missing URL');
        }
        const timestamp = options.timestamp || Date.now();

        const credentials = options.credentials;
        if (!credentials ||
            !credentials.id ||
            !credentials.key ||
            !credentials.algorithm) {

            throw new Error('Invalid credentials');
        }

        if (typeof uri === 'string') {
            uri = Utils.parseUri(uri);
        }
        const artifacts = {
            ts: timestamp,
            nonce: options.nonce || this.randomString(6),
            method,
            resource: uri.relative,                            // Maintain trailing '?'
            host: uri.host,
            port: uri.port || (uri.protocol === 'http' ? 80 : 443),
            hash: options.hash,
            ext: options.ext,
            app: options.app,
            dlg: options.dlg
        };

        // Calculate payload hash
        //TODO: This is not used as payload is never sent. Add option to enable this and send payload in options 
        if (!artifacts.hash && (options.payload || options.payload === '')) {

            artifacts.hash = this.calculatePayloadHash(options.payload, credentials.algorithm, options.contentType);
        }

        const mac = this.calculateMac('header', credentials, artifacts);

        // Construct header

        const hasExt = artifacts.ext !== null && artifacts.ext !== undefined && artifacts.ext !== '';       // Other falsey values allowed
        let header = 'Hawk id="' + credentials.id +
            '", ts="' + artifacts.ts +
            '", nonce="' + artifacts.nonce +
            (artifacts.hash ? '", hash="' + artifacts.hash : '') +
            (hasExt ? '", ext="' + this.escapeHeaderAttribute(artifacts.ext) : '') +
            '", mac="' + mac + '"';

        if (artifacts.app) {
            header = header + ', app="' + artifacts.app +
                (artifacts.dlg ? '", dlg="' + artifacts.dlg : '') + '"';
        }

        return { header, artifacts };
    }

    static calculateMac(type, credentials, options) {

        var normalized = this.generateNormalizedString(type, options);

        var hmac = crypto['Hmac' + credentials.algorithm.toUpperCase()](normalized, credentials.key);
        return hmac.toString(Base64);
    }

    static randomString(size) {

        var randomSource = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        var len = randomSource.length;

        var result = [];
        for (var i = 0; i < size; ++i) {
            result[i] = randomSource[Math.floor(Math.random() * len)];
        }

        return result.join('');
    }

    static calculatePayloadHash(payload, algorithm, contentType) {

        var hash = crypto.algo[algorithm.toUpperCase()].create();
        hash.update('hawk.1.payload\n');
        hash.update(this.parseContentType(contentType) + '\n');
        hash.update(payload);
        hash.update('\n');
        return hash.finalize().toString(Base64);
    }

    static parseContentType(header) {

        if (!header) {
            return '';
        }

        return header.split(';')[0].replace(/^\s+|\s+$/g, '').toLowerCase();
    }

    static generateNormalizedString(type, options) {

        let resource = options.resource || '';
        if (resource &&
            resource[0] !== '/') {

            const url = Utils.parseUri(resource);
            resource = url.path;                        // Includes query
        }

        let normalized = 'hawk.1.' + type + '\n' +
            options.ts + '\n' +
            options.nonce + '\n' +
            (options.method || '').toUpperCase() + '\n' +
            resource + '\n' +
            options.host.toLowerCase() + '\n' +
            options.port + '\n' +
            (options.hash || '') + '\n';

        if (options.ext) {
            normalized = normalized + options.ext.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
        }

        normalized = normalized + '\n';

        if (options.app) {
            normalized = normalized + options.app + '\n' +
                (options.dlg || '') + '\n';
        }

        return normalized;
    };

    static escapeHeaderAttribute(attribute) {

        return attribute.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
    }
}