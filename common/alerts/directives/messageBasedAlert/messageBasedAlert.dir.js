angular.module('Realize.alerts.messageBasedAlertDirective', [
    'Realize.paths',
    'Realize.alerts.alertService'
])
    // messageBasedAlert: applies bootstrap alert styling to given alert message
    // @attr autoClose. Optional. (Boolean) specifies whether alert should fade out automatically
    // @attr alertOn. Required. (Boolean) turns on alert
    // @attr alertMessageDetails. Required. (Object) the object rendered by template '/partials/alert_template'.
    // alertMessageDetails object must contain the properties: icon, type, and msg.
    // To support localization, get translated text through Messages service

    // Example:
    // <div alert auto-close='true' alert-message-details='myAlertMessageDetails'></div>
    .directive('messageBasedAlert', [
        '$timeout',
        '$rootScope',
        'PATH',
        'AlertService',
        function($timeout, $rootScope, PATH, AlertService) {
            'use strict';

            return {
                replace: true,
                scope: {
                    autoClose: '=',
                    alertMessageDetails: '=',
                    alertOn: '='
                },
                templateUrl: PATH.TEMPLATE_ROOT +
                    '/common/alerts/directives/messageBasedAlert/messageBasedAlert.dir.html',
                link: function(scope, el) {
                    var closeMe = function() {
                        scope.$apply(function() {
                            scope.alertOn = false;
                            scope.alertMessageDetails = null;

                            // Remove the alert after showing it
                            AlertService.alerts.splice(0, 1);
                        });
                    };
                    scope.$watch('alertMessageDetails', function() {
                        if (scope.alertMessageDetails && scope.autoClose) {
                            // Make sure element is visible after first alert hidden by fadeOut
                            $(el).show();
                            var timer = $timeout(function() {
                                $(el).fadeOut('slow', closeMe);
                            }, 5000);
                            scope.$on('$destroy', function destroy() {
                                $timeout.cancel(timer);
                            });
                        }
                    });
                }
            };
        }
    ]);
