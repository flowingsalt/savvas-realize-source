angular.module('Realize.eText.eTextCtrl', [
])
    .controller('ETextCtrl', [
        '$log',
        '$scope',
        '$location',
        'eTextData',
        function($log, $scope, $location, eTextData) {
            'use strict';

            $scope.etexts = eTextData;

            $scope.open = function(event, item) {
                event.stopPropagation();

                var path = $location.path();
                $location.path([path.replace('eText', 'content'), item.id, item.version].join('/'));
            };

            $scope.back = function() {
                $location.path('/program', true);
            };
        }
    ]);
