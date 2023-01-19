angular.module('Realize.common.coTeachersAlert', [
    'rlzComponents.components.i18n'
])
    .directive('coTeachersAlert', [
        '$rootScope',
        function($rootScope) {
            'use strict';

            return {
                restrict: 'EA',
                templateUrl: 'templates/common/coTeachersAlert/coTeachersAlert.dir.html',
                scope: {},
                link: function(scope) {
                    scope.isCoTeachersAlertVisible =
                        !$rootScope.currentUser.getAttribute('dialog.coteachers.info.seen') &&
                        $rootScope.currentUser.getAttribute('hasCoTeachers');

                    if (scope.isCoTeachersAlertVisible) {
                        var shouldPersistToServer = true;
                        $rootScope.currentUser.setAttribute('dialog.coteachers.info.seen', true, shouldPersistToServer);
                    }
                }
            };
        }
    ]);
