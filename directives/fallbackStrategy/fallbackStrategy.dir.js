angular.module('realize-lib.ui.fallback-strategy', [])
    .directive('fallbackStrategy', [
        '$log',
        function($log) {
            'use strict';

            return {
                restrict: 'A',
                link: function(scope, element, attributes) {
                    var fallbackSources = [];

                    function fallback() {
                        var replacement, oldSrc;
                        oldSrc = element.attr('src');

                        if (fallbackSources && fallbackSources.length > 0) {
                            replacement =  fallbackSources instanceof Array ?
                                fallbackSources.shift() : fallbackSources;
                        }

                        if (replacement && replacement !== oldSrc) {
                            element.attr('src', replacement);
                            $log.debug('fallbackStrategy: replaced src', oldSrc, replacement);
                        }

                        scope.$emit('fallbackStrategy.fallback.applied', element);
                    }

                    scope.$watch(attributes.fallbackStrategy, function(strategy) {
                        if (strategy) {
                            fallbackSources = angular.copy(strategy);
                        }

                        if (attributes.alternate) {
                            fallbackSources.push(attributes.alternate);
                        }
                    });

                    if (attributes.alternate) {
                        fallbackSources.push(attributes.alternate);
                    }

                    element.on('error', fallback);

                    element.one('load', function() {

                    }).each(function() {
                        if (this.complete && !(this.height && this.width)) {
                            fallback();
                        }
                    });
                }
            };
        }
    ]);
