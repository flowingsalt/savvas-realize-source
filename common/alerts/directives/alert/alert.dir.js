angular.module('Realize.alerts.alertDirective', [
        'Realize.paths'
    ])
    .value('ALERT_TTL', 5000)
    .directive('alert', [
        '$log',
        'PATH',
        'ALERT_TTL',
        function($log, PATH, ALERT_TTL) {
            'use strict';

            return {
                transclude: true,
                scope: {
                    alertType: '@',
                    alertOn: '=?',
                    alertEvent: '@?'
                },
                templateUrl: PATH.TEMPLATE_ROOT + '/common/alerts/directives/alert/alert.dir.html',
                link: function(scope, el, attrs) {

                    var close = function() {
                            scope.$applyAsync(function() {
                                scope.alertOn = false;
                            });
                        },
                        $close,
                        timeoutsToClear = [];
                    scope.alertClosable = angular.isDefined(attrs.alertClosable);
                    scope.alertNoFloat = angular.isDefined(attrs.alertNoFloat);

                    if (scope.alertEvent) {
                        scope.$on(scope.alertEvent, function(ev) {
                            $log.debug(ev);
                            scope.alertOn = true;
                        });
                    }

                    scope.$watch('alertOn', function(show) {
                        var timeoutId;
                        if (show && scope.$eval(attrs.autoClose)) {
                            //Due to e2e, we *have* to use setTimeout here
                            //not sure why, but using $timeout causes failures when checking for :visible alerts
                            timeoutId = setTimeout(close, ALERT_TTL);
                            timeoutsToClear.push(timeoutId);
                        }

                        if (show && scope.alertClosable) {
                            $close = el.find('.close');
                            $close.on('click', close);
                        }
                    });

                    scope.$on('$destroy', function() {
                        if ($close) {
                            $close.off('click', close);
                        }
                        timeoutsToClear.forEach(function(timeoutId) {
                            clearTimeout(timeoutId);
                        });
                    });
                }
            };
        }
    ]);
