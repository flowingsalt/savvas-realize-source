angular.module('Realize.sidebar.PlatformSidebar', [
    'Realize.user.currentUser',
    'Realize.paths'
])
    .directive('platformSidebar', [
        'currentUser',
        '$timeout',
        function(currentUser, $timeout) {
            'use strict';

            // Length of sidebar slide animation.
            var animationTime = 600;

            return {
                scope: {
                    content: '=',
                    show: '=',
                    openHandler: '=',
                    indexFocus: '=?'
                },
                replace: false,
                templateUrl: 'templates/sidebar/sidebar.platform.html',
                link: function(scope, element, attrs) {

                    scope.template = attrs.template;
                    scope.currentUser = currentUser;

                    function setFocus (open) {
                        if (open && (angular.isUndefined(scope.indexFocus) || scope.indexFocus)) {
                            $timeout(function() {
                                element.find('a').first().focus();
                            }, animationTime, false); // wait for the animation to complete
                        }
                    }

                    scope.$on('$dataLoaded', function() {
                        $timeout(function() {
                            setFocus(false);
                        });
                    });

                    scope.$on('sidebar:close', function() {
                        $timeout(function() {
                            scope.show = false;
                        });
                    });
                    scope.$on('sidebar:open', function() {
                        $timeout(function() {
                            scope.show = true;
                            setFocus(true);
                        });
                    });
                }
            };
        }
    ]);
