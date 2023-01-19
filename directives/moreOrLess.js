angular.module('RealizeDirectives')
    .directive('peteMore', [
        '$log',
        '$timeout',
        function($log, $timeout) {
            'use strict';

            return {
                template: [
                    '<ul class="quicklinks moreOrLess">',
                        '<li class="no-margin">',
                            '<a href="javascript://" ng-click="toggleMore($event)" aria-expanded="{{more}}">',
                            '<span>{{ text }}</span></a>',
                        '</li>',
                    '</ul>'
                ].join(''),
                replace: true,
                scope: {
                    more: '=', // link to the test
                    moreText: '@moreText',
                    lessText: '@lessText',
                    onToggle: '&',
                },
                controller: ['$scope', '$attrs', function($scope, $attrs) {
                    $scope.text = $scope.moreText;
                    $scope.icon = 'caret-down';

                    // dynamic resize box-shadow bug in IE9 (and possibly IE10)
                    // more/less links expand and modify the height of its container
                    // test if used in a modal, then re-apply box-shadow style on toggle
                    var inModal = $('.modalRegion').has('.modal').length ? true : false;
                    var $modal = $('.modalRegion .modal');

                    $scope.$watch('more', function(more) {
                        if (more === true) {
                            $scope.text = $scope.lessText;
                            $scope.$parent.$eval($attrs.onMore);
                        }

                        if (more === false) {
                            $scope.text = $scope.moreText;
                            $scope.$parent.$eval($attrs.onLess);
                        }
                    });

                    $scope.toggleMore = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        if (inModal) {
                            $modal.removeClass('drop-shadow');
                        }

                        $scope.more = !$scope.more;
                        //$log.log('toggleMore', $scope.more);

                        if (inModal) {
                            $timeout(function() {
                                $modal.addClass('drop-shadow');
                            }, 5);
                        }

                        $scope.onToggle({$event: e, toggle: $scope.more});
                    };
                }]
            };
        }
    ]);
