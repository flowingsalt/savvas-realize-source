angular.module('RealizeApp')
    .controller('CentersTierCtrl', [
        '$scope',
        '$location',
        '$log',
        'TierContent',
        'MediaQuery',
        function($scope, $location, $log, TierContent, MediaQuery) {
            'use strict';

            $scope.content = TierContent;

            $scope.isMixedMode = function(tocView) {
                return tocView === 'list' && $scope.sidebarOpen && !MediaQuery.breakpoint.isDesktop;
            };

            $scope.back = function(e) {
                e.stopPropagation();

                $scope.goBack(function() {

                    var path = $location.path(),
                        target;

                    // if inside a tier, remove tier from path prior to navigating
                    if (path.search('/tier2/') >= 0) {
                        target = path.split('tier2')[0];

                    } else if (path.search('/tier') >= 0) {
                        target = path.split('tier')[0];
                    } else {
                        target = '/centers';
                    }

                    $location.path(target);
                }, true);
            };
        }
    ]);
