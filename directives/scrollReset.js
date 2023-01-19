angular.module('RealizeDirectives')
    .directive('scrollReset', [
        '$timeout',
        function($timeout) {
            'use strict';

            return {
                link: function(scope, el) {
                    $timeout(function() {
                        el.scrollTop(1);
                    }, 250);
                }
            };
        }
    ]);
