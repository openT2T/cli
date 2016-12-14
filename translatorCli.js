/* jshint esversion: 6 */
/* jshint node: true */
'use strict';
var inquirer = require('inquirer');
var helpers = require('./helpers');
var q = require('q');

class TranslatorCli {
    constructor() {
        this.OpenT2T = require('opent2t').OpenT2T;
    }

    // loads the specified translator and performs the onboarding for it
    getProperty(translatorName, deviceInfo, property, value) {
        helpers.logHeader("Getting " + property + " from " + translatorName);

        return this.createTranslator(translatorName, deviceInfo).then(translator => {
            return this.OpenT2T.invokeMethodAsync(translator, "", property, [value]);
        });
    }

    setProperty(translatorName, deviceInfo, property, deviceId, value) {
        helpers.logHeader("Setting " + translatorName + " to:");
        helpers.logObject(value);

        return this.createTranslator(translatorName, deviceInfo).then(translator => {
            return this.OpenT2T.invokeMethodAsync(translator, "", property, [deviceId, value]);
        });
    }
    
    createTranslator(translatorName, deviceInfo) {
        return this.OpenT2T.createTranslatorAsync(translatorName, deviceInfo).then( translator => {
            return translator;
        }); 
    }

    subscribe(translatorName, deviceInfo, callbackUrl) {
        helpers.logHeader("Subscribing to " + translatorName + " " + devicId);

        var subscriptionInfo = {};
        subscriptionInfo.callbackUrl = callbackUrl;
        helpers.logObject(subscriptionInfo);

        return this.createTranslator(translatorName, deviceInfo).then(translator => {
            return this.OpenT2T.invokeMethodAsync(translator, "", "postSubscribe", [subscriptionInfo]);
        });
    }

    unsubscribe(translatorName, deviceInfo, callbackUrl) {
        helpers.logHeader("Unsubscribing to " + translatorName + " " + devicId);

        var subscriptionInfo = {};
        subscriptionInfo.callbackUrl = callbackUrl;
        helpers.logObject(subscriptionInfo);

        return this.createTranslator(translatorName, deviceInfo).then(translator => {
            return this.OpenT2T.invokeMethodAsync(translator, "", "deleteSubscribe", [subscriptionInfo]);
        });
    }

    translate(translatorName, deviceInfo, payload) {
        helpers.logHeader("Translating provider formated payload to opent2t");

        return this.createTranslator(translatorName, deviceInfo).then(translator => {
            return this.OpenT2T.invokeMethodAsync(translator, "", "getPlatforms", [true, payload ]);
        });
    }
}

module.exports = TranslatorCli;