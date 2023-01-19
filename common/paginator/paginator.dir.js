angular.module('Realize.common.paginator', [
    'Realize.paths'
])
    .directive('paginator', [
        '$log',
        'RealizeHelpers',
        'PATH',
        function($log, RealizeHelpers, PATH) {
            'use strict';

            return {
                scope: {
                    page: '=',
                    total: '@',
                    limit: '@',
                    range: '@',
                    onPageChange: '&?'
                },
                replace: false,
                templateUrl: PATH.TEMPLATE_ROOT + '/common/paginator/paginator.dir.html',
                controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {
                    $scope.setPage = function(pg) {
                        if ($scope.onPageChange) {
                            $scope.onPageChange({page: pg});
                        } else {
                            RealizeHelpers.updateParentScopeValue($scope, $attrs.page, pg);
                        }
                        $('html, body').animate({
                            scrollTop: 0
                        }, 0);
                    };

                    $scope.goFirst = function() {
                        $scope.setPage(1);
                    };

                    $scope.goLast = function() {
                        $scope.setPage($scope.totalPages);
                    };

                    $scope.goNext = function() {
                        $scope.setPage($scope.page + 1);
                    };

                    $scope.goPrevious = function() {
                        $scope.setPage($scope.page - 1);
                    };

                    $scope.$on('paginator.page.changed', function(ev, page) {
                        $scope.setPage(page);

                    });

                    function calcVisibleRange(page, totalPages, count) {
                        var start = 1;

                        if (totalPages > count) {
                            start = page - Math.floor(count / 2);

                            // note: can be two ternaries, but left expanded for clarity
                            if (page < count || page > totalPages - count) {
                                if ((page > totalPages - Math.ceil(count / 2))) {
                                    start = totalPages - count;
                                } else if (page < Math.ceil(count / 2)) {
                                    start = 1;
                                }
                            }
                        }

                        return _.range(start || 1, Math.min(start + count, totalPages) + 1);
                    }

                    $scope.$watch('total + page', function() {
                        $scope.totalPages = parseInt(Math.ceil($scope.total / $scope.limit), 10);
                        $scope.visibleRange = calcVisibleRange($scope.page, $scope.totalPages, 10);
                    });

                }]
            };
        }
    ]);
