'use strict';
var inquirer = require('inquirer');
var q = require('q');
var fs = require('fs');
var glob = require("glob");
var path = require('path');
var OpenT2T = require('opent2t').OpenT2T;
var OnboardingCli = require("../onboardingCli");
var helpers = require('../helpers');
var BaseController = require("./baseController");
var HubController = require("./hubController");

class MainController extends BaseController {
    constructor() {
        super();

        let hubInfoFiles = glob.sync('./*_onboardingInfo.json');
        MainController.knownHubs = hubInfoFiles.map(f => path.basename(f).replace('_onboardingInfo.json', ''));
        this.addOperation('Onboard hub', MainController.onboardHub);
    }

    getOperations(state) {
        let extraOperations = [];

        if (MainController.knownHubs.length > 0) {
            extraOperations.push(this.createOperation('Refresh oAuth token', MainController.refreshAuthToken));
            extraOperations.push(this.createOperation('Select hub', MainController.selectHub));
        }

        return this.operations.concat(extraOperations);
    }

    static onboardHub(state) {
        let deferred = q.defer();

        let questions = [
            {
                type: 'input',
                name: 'hubPackage',
                message: 'What is the name of the hub to onboard (e.g. opent2t-translator-com-contoso-hub)'
            }
        ];

        inquirer.prompt(questions).then(function (answers) {
            if (MainController.knownHubs.indexOf(answers.hubPackage) === -1) {
                let fileName = helpers.createOnboardingFileName(answers.hubPackage);
                let onboardingCli = new OnboardingCli();
                onboardingCli.doOnboarding(answers.hubPackage).then(info => {
                    let data = JSON.stringify(info);
                    fs.writeFile(fileName, data, function (err) {
                        if (err) {
                            deferred.reject(err);
                        }
                        else {
                            console.log("Saved!");
                            MainController.knownHubs.push(answers.hubPackage);
                            deferred.resolve(state);
                        }
                    });
                }).catch(err => {
                    deferred.reject(err);
                });
            }
            else {
                console.log("\nHub %s has already been onboarded.\n".header, answers.hubPackage);
                deferred.resolve(state);
            }
        });

        return deferred.promise;
    }

    static refreshAuthToken(state) {
        let deferred = q.defer();

        let questions = [
            {
                type: 'rawlist',
                name: 'hubPackage',
                message: 'Select hub to refresh',
                choices: MainController.knownHubs
            }
        ];

        inquirer.prompt(questions).then(function (results) {
            let onboardingCli = new OnboardingCli();
            onboardingCli.loadTranslatorAndGetOnboardingAnswers(results.hubPackage).then(answers => {
                let fileName = helpers.createOnboardingFileName(results.hubPackage);
                helpers.readFile(fileName, "Please complete onboarding").then(data => {
                    let authInfo = JSON.parse(data);
                    OpenT2T.createTranslatorAsync(results.hubPackage, authInfo).then(translator => {
                        OpenT2T.invokeMethodAsync(translator, "", 'refreshAuthToken', [answers]).then(refreshedInfo => {
                            let refreshedData = JSON.stringify(refreshedInfo);
                            fs.writeFile(fileName, refreshedData, function (err) {
                                if (err) {
                                    deferred.reject(err);
                                }
                                console.log("Saved!");
                                deferred.resolve(state);
                            });

                        }).catch(error => {
                            deferred.reject(error);
                        });
                    }).catch(error => {
                        deferred.reject(error);
                    });
                });
            });
        });

        return deferred.promise;
    }

    static selectHub(state) {
        let deferred = q.defer();

        let questions = [
            {
                type: 'rawlist',
                name: 'hubName',
                message: 'Which hub would you like?',
                choices: MainController.knownHubs
            }
        ];

        inquirer.prompt(questions).then(function (answers) {
            let hub = { name: answers.hubName };
            let fileName = helpers.createOnboardingFileName(hub.name);
            helpers.readFile(fileName, "Please complete onboarding").then(data => {
                hub.deviceInfo = JSON.parse(data);
                OpenT2T.createTranslatorAsync(hub.name, hub.deviceInfo).then(translator => {
                    hub.translator = translator;
                    OpenT2T.invokeMethodAsync(translator, "", 'getPlatforms', []).then(info => {
                        hub.platforms = info.platforms;
                        hub.devices = [];
                        for (var i = 0; i < info.platforms.length; i++) {
                            var item = info.platforms[i];
                            var device = { id: item.opent2t.controlId, name: item.n, translatorName: item.opent2t.translator };
                            device.longName = device.name + ' (' + device.translatorName + ')';
                            hub.devices.push(device);
                        }
                        state.currentHub = hub;
                        state.controllerStack.push(state.currentController);
                        state.currentController = new HubController();
                        deferred.resolve(state);
                    });
                }).catch(error => {
                    deferred.reject(error);
                });
            }).catch(error => {
                deferred.reject(error);
            });
        });

        return deferred.promise;
    }
}

module.exports = MainController;