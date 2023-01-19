angular.module('Realize.alerts.firstVisitAlertDirective', [
    'Realize.paths',
    'rlzComponents.components.i18n'
])
    .directive('firstVisitAlert', [
        '$log',
        'PATH',
        function($log, PATH) {
            'use strict';

            return {
                replace: true,
                scope:{
                    title: '=firstVisitAlert',
                    description: '=',
                    instruction: '=?',
                    closeFn:'='
                },
                templateUrl: PATH.TEMPLATE_ROOT + '/common/alerts/directives/firstVisitAlert/firstVisitAlert.dir.html'
            };
        }
    ]);
