angular.module('RealizeApp')
    .directive('adjustHeightForBar', [
        '$log',
        '$window',
        function($log, $window) {
            'use strict';

            return {
                restrict: 'A',
                link: function(scope, el, attrs) {
                    var window = angular.element($window),
                        bar = attrs.adjustHeightForBar,
                        resize = function() {
                            var barHeight = angular.element(bar).height(),
                                // magic number for double scroll bar (TODO: investigate source)
                                height = window.height() - barHeight - 4;

                            el.attr('height', height);
                        };

                    resize();
                    window.on('resize', resize);

                    el.on('$destroy', function() {
                        window.off('resize', resize);
                    });
                }
            };
        }
    ]);
