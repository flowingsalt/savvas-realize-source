angular.module('RealizeApp')
    .directive('ajaxSubmit', [
        '$q',
        '$log',
        '$parse',
        '$http',
        '$rootScope',
        function($q, $log, $parse, $http, $rootScope) {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    var getData = $parse(attrs.ajaxData),
                        ajaxSubmitAction;

                    ajaxSubmitAction = function() {
                        var deferred = $q.defer(),
                            promise = deferred.promise;

                        el.ajaxSubmit({
                            url: scope.$eval(attrs.ajaxSubmit),
                            data: getData(scope),
                            dataType: 'json',
                            type: 'POST',
                            success: function(response) {
                                if ($rootScope.isIE9 && response.success === false) {
                                    scope.$applyAsync(function() { deferred.reject(response); });
                                }

                                scope.$applyAsync(function() { deferred.resolve(response); });
                            },
                            error: function(response) {
                                scope.$applyAsync(function() { deferred.reject(response); });
                            }
                        });

                        return promise;
                    };

                    el.on('submit', function() {
                        if (angular.isDefined(attrs.ajaxValidator) && !scope.$eval(attrs.ajaxValidator)) {
                            return;
                        }

                        scope.$applyAsync(function() {
                            var promise = ajaxSubmitAction();
                            scope.$emit('onAjaxSubmit', promise);
                        });
                    });
                }
            };
        }
    ]);
