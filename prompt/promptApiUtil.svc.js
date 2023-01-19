angular.module('Realize.Prompt.promptApiUtilService', [
    'Realize.paths',
    'Realize.analytics'
])
    .service('promptApiUtilService', [
        '$q',
        '$http',
        'REST_PATH',
        'Analytics',
        function($q, $http, REST_PATH, Analytics) {
            'use strict';
            var svc = this,
                promptUrl = REST_PATH + '/prompts',
                headers = {
                    headers: {'Content-Type': 'application/json'}
                },
                editingPromptUrl = promptUrl + '/',
                options = angular.extend({}, headers);

            svc.savePromptData = function(promptData, classId) {
                var URL = promptUrl + '?classId=' + classId;
                return $http.post(URL, JSON.stringify(promptData), headers)
                    .then(function(response) {
                        return response.data;
                    }, function(response) {
                        if (response.status === 404) {
                            return {};
                        }
                        return $q.reject(response);
                    });
            };

            svc.getPromptList = function(classId) {
                var options = angular.extend({}, headers);

                options.params = {
                    classId: classId
                };
                return $http.get(promptUrl, options)
                    .then(function(response) {
                        return response.data;
                    }, function(response) {
                        if (response.status === 404) {
                            return {};
                        }
                        return $q.reject(response);
                    });

            };

            svc.deletePrompt = function(promptId) {
                var URL = editingPromptUrl + promptId;
                return $http.delete(URL).then(function(response) {
                    return response;
                }, function(err) {
                    return $q.reject('Error deleting prompt', err);
                });
            };

            svc.unDeletePrompt = function(promptId, classId) {
                var URL = editingPromptUrl + promptId  + '/mappings',
                    prompt = {
                        classId: classId
                    };
                return $http.post(URL, JSON.stringify(prompt), options);
            };

            svc.updatePrompt = function(promptId, prompt) {
                var URL = editingPromptUrl + promptId;

                return $http.put(URL, JSON.stringify(prompt), options)
                    .then(function(response) {
                        return response.data;
                    }, function(response) {
                        if (response.status === 404) {
                            return {};
                        }
                        return $q.reject(response);
                    });

            };

            svc.getActiveDiscussionList = function(classId) {
                var options = angular.extend({}, headers),
                    url = REST_PATH + '/discussions/classes/' + classId;
                return $http.get(url, options)
                    .then(function(response) {
                        return response.data;
                    }, function(response) {
                        if (response.status === 404) {
                            return {};
                        }
                        return $q.reject(response);
                    });

            };

            svc.analyticsForPrompt = function(description) {
                Analytics.track('track.action', {
                    category: 'Classes',
                    action: 'Discuss',
                    label: description
                });
            };
        }
    ]);
