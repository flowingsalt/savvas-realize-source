angular.module('Realize.admin.programs.programTaxonomyService', [
    'Realize.paths'
])
    .service('ProgramTaxonomyService', [
        '$q',
        '$http',
        'REST_PATH',
        function($q, $http, REST_PATH) {
            'use strict';

            var service = this;

            service.getAllPrograms = function() {
                return $http.get(REST_PATH + '/libraries')
                    .then(function(response) {
                        var libs = response.data,
                            thumbRegex = /\.(gif|jpg|jpeg|tiff|png)$/i;

                        // hack logic because of OLE
                        angular.forEach(libs, function(lib) {
                            if (lib.thumb.search(thumbRegex) === -1) {
                                lib.thumb = 'shared/' + lib.thumb + '_course.png';
                            }
                        });

                        return libs;
                    }, function(response) {
                        return $q.reject(response.data);
                    });
            };

            service.uploadProgram = function(formElement, successCallback, errorCallback) {
                formElement.ajaxSubmit({
                    url: REST_PATH + '/taxonomies/subscription',
                    type: 'POST',
                    iframe: true,
                    dataType: 'json',
                    success: function(data) {
                        successCallback(data);
                    },
                    error: function(data) {
                        errorCallback(data);
                    }
                });
            };

            service.uploadEtext = function(formElement, successCallback, errorCallback) {
                formElement.ajaxSubmit({
                    url: REST_PATH + '/taxonomy/upsert/subscription/node',
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        parentFullPath: '',
                        subscriptiontype: 'eText'
                    },
                    success: function(data) {
                        successCallback(data);
                    },
                    error: function(data) {
                        errorCallback(data);
                    }
                });
            };

            service.editProgram = function(formElement, callback) {
                var result;

                formElement.ajaxSubmit({
                    url: REST_PATH + '/taxonomy/rename/subscription/node',
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        termFullPath: formElement.scope().prog.title
                    },
                    success: function(data) {
                        result = {
                            success: data,
                            title: formElement.scope().prog.title
                        };
                        callback(result);
                    }
                });
            };

            // Functions below are From OLE taxonomy API
            service.getPublishMigrationCount = function(title, async, callback) {
                var count = 0;
                $.ajax({
                    url: REST_PATH + '/taxonomies/subscription/published',
                    type: 'PUT',
                    async: async || false,
                    data: {
                        termFullPath: title,
                        execute: false
                    },
                    success: function(data) {
                        count = data;
                        if ($.isFunction(callback)) {
                            callback(count);
                        }
                    }
                });
                return count;
            };

            service.removeProgramSubscription = function(title, callback) {
                var data = {termFullPath: title};
                $.ajax({
                    url: REST_PATH + '/taxonomies/subscription/terms?' +  $.param(data),
                    type: 'DELETE',
                    async: false,
                    success: function(result) {
                        callback(result);
                    },
                    error: function(result) {
                        callback(result);
                    }
                });
            };

            service.publishProgram = function(title, callback) {
                var data = {
                    termFullPath: title,
                    execute: true
                };
                $.ajax({
                    url: REST_PATH + '/taxonomies/subscription/published?' + $.param(data),
                    type: 'PUT',
                    async: false,
                    success: function(result) {
                        if ($.isFunction(callback)) {
                            callback(result);
                        }
                    }
                });
            };

            var subscriptionStatus;
            service.setSubscriptionStatus = function(statusObject) {
                subscriptionStatus = statusObject;
            };

            service.getSubscriptionStatus = function() {
                return subscriptionStatus;
            };
        }
    ]);
