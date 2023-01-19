angular.module('Realize.admin.ltiConsumer.common.LTIConsumerSettingsSvc', [
        'rlzComponents.components.i18n',
        'Realize.paths',
        'Realize.admin.ltiConsumer.common.LTIConsumerSettingModel'
    ])
    .service('LTIConsumerSettingsSvc', [
        '$http',
        'PATH',
        'lwcI18nFilter',
        'LTIConsumerSettingModel',
        function($http, PATH, lwcI18nFilter, LTIConsumerSettingModel) {
            'use strict';

            var BASE_ENDPOINT = [PATH.REST, 'externaltool'].join('/'),
                cacheById = {},
                CUST_ENDPOINT = [PATH.REST, 'custom', 'fields'].join('/');
            this.custom = function() {
                return $http.get(CUST_ENDPOINT)
                    .then(function(response) {
                        var customopt = response.data;
                        return customopt;
                    });
            };

            function transformCustomFields(setting) {
                //Need to remove angular's $$hashKey property and remove any functions b/c $.param calls them

                return (setting.customFields || []).filter(function nonBlank(cf) {
                    //since user can add any number of CF rows, filter out all without a key
                    return cf.key && cf.key.length > 0 &&
                        cf.value && cf.value.length > 0;
                }).map(function(cf) {
                    return {
                        key: cf.key,
                        value: cf.value
                    };
                });
            }

            this.list = function() {
                var self = this;
                cacheById = {};
                return $http.get(BASE_ENDPOINT).then(function(response) {
                    return response.data.map(function(item) {
                        item.lastUpdated = moment(item.lastUpdated);
                        var privacyLevel = self.privacySettings.filter(function(privacySetting) {
                            return privacySetting.value === item.privacyLevel;
                        })[0];

                        if (angular.isDefined(privacyLevel)) {
                            item.privacyLevelLabel = privacyLevel.label;
                        }

                        cacheById[item.configurationUuid] = item;
                        return new LTIConsumerSettingModel(item);
                    });
                });
            };

            this.add = function(ltiConfig) {
                return $http.post(BASE_ENDPOINT, angular.copy(ltiConfig), {
                    transformRequest: function(setting) {

                        //trim down the object to only what backend expects
                        //because $.param will go through all props of an object
                        //and if a prop is a function it will call it.
                        //This causes problems when serializing a model instance
                        //that has proto functions referencing "this"
                        setting = {
                            name: setting.name,
                            description: setting.description || '',
                            ltiPartner: setting.partner || '',
                            key: setting.key,
                            secret: setting.secret,
                            domain: setting.domain,
                            openNewWindow: setting.openNewWindow,
                            configureClassId: setting.configureClassId,
                            privacyLevel: setting.privacyLevel,
                            customFields: setting.customFields || []
                        };

                        //Making the customFields dictionary a JSON string so it's serialized properly
                        //and it will be de-serialized on server side
                        setting.customFields = JSON.stringify(transformCustomFields(setting));

                        //default transformRequest function uses $.param(object, true)
                        //to do a shallow parameterization of the payload.
                        return $.param(setting, true);
                    }
                });
            };

            this.update = function(ltiConfig) {
                var endpoint = [
                    BASE_ENDPOINT,
                    ltiConfig.configurationUuid
                ].join('/');

                return $http.put(endpoint, angular.copy(ltiConfig), {
                    headers: {
                        'Content-type': 'application/json'
                    },
                    transformRequest: function(setting) {
                        setting.customFields = transformCustomFields(setting);
                        setting.ltiPartner = setting.partner || '';
                        setting.description = setting.description || '';
                        return JSON.stringify(setting);
                    }
                }).then(function() {
                    cacheById[ltiConfig.configurationUuid] = ltiConfig;
                });
            };

            this.delete = function(ltiConfigId) {
                var endpoint = [
                    BASE_ENDPOINT,
                    ltiConfigId
                ].join('/');

                return $http.delete(endpoint);
            };

            this.undelete = function(ltiConfigId) {
                var endpoint = [
                    BASE_ENDPOINT,
                    ltiConfigId,
                    'undelete'
                ].join('/');

                return $http.post(endpoint);
            };

            this.hasSettingForDomain = function(domainName, settingId) {
                return !Object.keys(cacheById).every(function checkDomain(id) {
                    return settingId === id || cacheById[id].domain.toLowerCase() !== domainName.toLowerCase();
                });
            };

            this.hasSettingNamedSame = function(name, settingId) {
                return !Object.keys(cacheById).every(function checkName(id) {
                    return settingId === id || cacheById[id].name.toLowerCase() !== name.toLowerCase();
                });
            };

            Object.defineProperty(this, 'privacySettings', {
                get: function() {
                    return [{
                        value: 'NONE',
                        label: lwcI18nFilter(
                            'ltiConsumerAdmin.create.labels.privacyLevelOpts.none')
                    }, {
                        value: 'NAME_ONLY',
                        label: lwcI18nFilter(
                            'ltiConsumerAdmin.create.labels.privacyLevelOpts.nameOnly')
                    }, {
                        value: 'EMAIL_ONLY',
                        label: lwcI18nFilter(
                            'ltiConsumerAdmin.create.labels.privacyLevelOpts.emailOnly')
                    }, {
                        value: 'FULL',
                        label: lwcI18nFilter(
                            'ltiConsumerAdmin.create.labels.privacyLevelOpts.full')
                    }];
                }
            });
        }
    ]);
