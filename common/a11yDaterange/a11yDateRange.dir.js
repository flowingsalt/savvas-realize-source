//TODO: Convert into its own module
angular.module('RealizeDirectives')
    .directive('a11yDateRange', [
        function() {
            'use strict';

            return {
                replace: true,
                scope: true,
                templateUrl: 'templates/common/a11yDaterange/a11yDaterange.dir.html',
                link: function($scope) {
                    $scope.a11yDateRangeOption = 'last30Days';
                    $scope.updateDateRange = function() {
                        switch ($scope.a11yDateRangeOption) {
                            case 'today':
                                $scope.filters = {
                                    startDate: Date.today().toString('MM/dd/yyyy'),
                                    endDate: Date.today().toString('MM/dd/yyyy')
                                };
                                break;
                            case 'week':
                                $scope.filters = {
                                    startDate: Date.today().addDays(-6).toString('MM/dd/yyyy'),
                                    endDate: Date.today().toString('MM/dd/yyyy')
                                };
                                break;
                            case 'month':
                                $scope.filters = {
                                    startDate: Date.today().moveToFirstDayOfMonth().toString('MM/dd/yyyy'),
                                    endDate: Date.today().moveToLastDayOfMonth().toString('MM/dd/yyyy')
                                };
                                break;
                            case 'year':
                                $scope.filters = {
                                    startDate: Date.today().moveToMonth(0, -1).moveToFirstDayOfMonth()
                                        .toString('MM/dd/yyyy'),
                                    endDate: Date.today().moveToMonth(11).moveToLastDayOfMonth().toString('MM/dd/yyyy')
                                };
                                break;
                            case 'last30Days':
                                $scope.filters = {
                                    startDate: Date.today().addMonths(-1).toString('MM/dd/yyyy'),
                                    endDate: Date.today().toString('MM/dd/yyyy')
                                };
                                break;
                            default:
                                $scope.filters = {
                                    startDate: Date.today().addMonths(-1).toString('MM/dd/yyyy'),
                                    endDate: Date.today().toString('MM/dd/yyyy')
                                };
                                break;
                        }
                        $scope.$emit('a11yDateRange.date.selected', $scope.filters);
                    };

                } // END Link
            };
        }
    ]);
