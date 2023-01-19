// showOrHide.js - directive
angular.module('RealizeDirectives')
    .directive('showHide', [
        function() {
            'use strict';

            return {
                template: [
                    '<ul class="quicklinks student-tips-link pull-right">',
                        '<li class="no-margin">',
                            '<a href="javascript://" ng-click="toggleShow($event)">',
                                '<i class="icon-{{ icon }}"></i>',
                                '<span>{{ text }}</span>',
                            '</a>',
                        '</li>',
                    '</ul>'
                ].join(''),
                replace: true,
                scope: {
                    show: '=',
                    hideText: '@hideText',
                    showText: '@showText'
                },
                controller: ['$scope', '$attrs', function($scope, $attrs) {
                    $scope.text = $scope.hideText;
                    $scope.icon = 'info-sign';

                    $scope.$watch('show', function(show) {
                        if (show === true) {
                            $scope.text = $scope.hideText;
                            $scope.$parent.$eval($attrs.onShow);
                        }

                        if (show === false) {
                            $scope.text = $scope.showText;
                            $scope.$parent.$eval($attrs.onHide);
                        }
                    });

                    $scope.toggleShow = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        $scope.show = !$scope.show;
                    };
                }]
            };
        }
    ]);
