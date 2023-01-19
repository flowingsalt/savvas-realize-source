angular.module('RealizeApp')
    .controller('CenterCtrl', [
        '$scope',
        '$routeParams',
        '$location',
        '$log',
        'CenterContent',
        'webStorage',
        '$timeout',
        'TEACHER_RESOURCES_DRAWER',
        function($scope, $routeParams, $location, $log, CenterContent, webStorage, $timeout, TEACHER_RESOURCES_DRAWER) {
            'use strict';

            $scope.content = CenterContent;

            var openKey = TEACHER_RESOURCES_DRAWER + $scope.currentUser.userId,
                timer;
            timer = $timeout(
                function() {
                    var shouldOpen = webStorage.get(openKey),
                        content = $scope.content,
                        hasContentItems = content && !_.isEmpty(content.contentItems),
                        hasTeacherSupport = content && !_.isEmpty(content.associatedTeacherSupport) &&
                            !_.isEmpty(content.associatedTeacherSupport.contentItems);

                    if (shouldOpen && hasContentItems && hasTeacherSupport) {
                        $scope.sidebarOpen = shouldOpen;
                    }
                }
            );

            $scope.$watch('sidebarOpen', function(isOpen) {
                if (!angular.isDefined(isOpen)) {
                    return;
                }

                webStorage.add(openKey, isOpen);
            });

            $scope.open = function(e, item) {
                e.preventDefault();
                e.stopPropagation();

                var p = $location.path();

                if (item.$isNbcItem()) {
                    p = ['/nbclearn/video', item.id, item.version].join('/');
                } else {
                    p = [p, 'content', item.id, item.version].join('/');
                }

                $location.path(p);
            };

            $scope.back = function(e) {
                e.stopPropagation();

                var path = $location.path(),
                    next;

                if ($routeParams.keywords) {
                    next = path.split('/search')[0] + '/search';
                } else {
                    next = path.split('/center/')[0];
                }

                $scope.goBack(next, true);
            };

            $scope.$on('$destroy', function destroy() {
                $timeout.cancel(timer);
            });
        }
    ]);
