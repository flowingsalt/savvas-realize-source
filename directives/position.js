angular.module('RealizeDirectives')
    .directive('reaPosition', [
        '$log',
        '$timeout',
        function($log, $timeout) {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    var reposition = function() {
                        //$log.log('reposition', el, attrs);

                        var config = {},
                            options = ['my', 'at', 'of', 'collision']; // todo: support more?

                        angular.forEach(options, function(option) {
                            if (angular.isDefined(attrs[option])) {
                                config[option] = attrs[option];
                            }
                        });

                        // not sure why exactly this wasn't working in this thread...
                        $timeout(function() { $(el).position(config); });
                    };

                    scope.$watch(attrs.reaPosition, function(val) {
                        if (val) {
                            reposition();
                        }
                    });

                    reposition();
                }
            };
        }
    ])

    .directive('hasFixedElements', [
        function() {
            'use strict';

            return function(scope, element) {
                if (Modernizr.touch) {
                    scope.$on('$viewContentLoaded', function() {
                        var $inputs = angular.element('input'),
                            eventNamespace = '.hasFixedElements';
                        $inputs.on('focus' + eventNamespace, function() {
                            element.addClass('fixfixed');
                        });
                        $inputs.on('blur' + eventNamespace, function() {
                            element.removeClass('fixfixed');
                        });
                        scope.$on('$destroy', function() {
                            $inputs.off(eventNamespace);
                        });
                    });
                }
            };
        }
    ]);
