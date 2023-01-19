angular.module('RealizeApp')
    .controller('TierCtrl', [
        '$scope',
        '$rootScope',
        '$location',
        '$log',
        'Content',
        'TierContent',
        '$route',
        'MediaQuery',
        function($scope, $rootScope, $location, $log, Content, TierContent, $route, MediaQuery) {
            'use strict';

            // these should be guaranteed to be loaded by the route's resolve
            $scope.program = $rootScope.currentProgram;
            $scope.content = TierContent;

            $scope.isMixedMode = function(tocView) {
                return tocView === 'list' && $scope.sidebarOpen && !MediaQuery.breakpoint.isDesktop;
            };

            $scope.back = function() {
                var next, pathArray, always = true;
                if ($route.current.params.itemId) { // tier or tier2
                    if (/\/tier2/.test($location.path())) {
                        pathArray = $location.path().split('/tier2');
                        pathArray.pop();
                        next = pathArray.join('/tier2');
                    } else if (/\/tier/.test($location.path())) {
                        pathArray = $location.path().split('/tier');
                        pathArray.pop();
                        next = pathArray.join('/tier');
                    } else {
                        // dunno what else? don't think this will/should ever get hit
                        next = $location.path();
                    }
                    $scope.goBack(next, always);
                } else {
                    $scope.goBack();
                }
            };
        }
    ]);
