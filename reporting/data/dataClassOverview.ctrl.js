angular.module('Realize.reporting.data.DataClassOverviewCtrl', [
        'RealizeDataServices',
        'Realize.common.DateRangeSelector',
        'Realize.reporting.ReportService'
    ])
    .controller('DataClassOverviewCtrl', [
        '$scope',
        'RosterData',
        'Modal',
        'User',
        'lwcI18nFilter',
        '$location',
        '$rootScope',
        '$log',
        'ReportService',
        '$q',
        'RealizeHelpers',
        'Analytics',
        'ISODateService',
        'REST_PATH',
        '$window',
        'BrowserInfo',
        'featureManagementService',
        'locationUtilService',
        'penpalService',
        '$timeout',
        function($scope, RosterData, Modal, User, lwcI18nFilter, $location, $rootScope, $log,
                ReportService, $q, $helpers, Analytics, ISODateService, REST_PATH, $window,
                BrowserInfo, featureManagementService, locationUtilService, penpalService, $timeout) {
            'use strict';

            $scope.currentRoster = RosterData;

            $scope.dateRange = {};

            $scope.pageLoading();

            $scope.isIDevice = BrowserInfo.isIDevice;

            $scope.isAssessmentMaintenancePageEnabled = featureManagementService.isAssessmentMaintenancePageEnabled();

            if ($scope.isAssessmentMaintenancePageEnabled) {
                $scope.pageLoaded();
                return;
            }

            $scope.exportScores = function() {
                var exportData = function(programName) {
                        var url = [REST_PATH, 'classes', $scope.currentRoster.classId, 'grades'].join('/'),
                            startDate = new Date($scope.filters.startDate),
                            endDate = new Date($scope.filters.endDate);
                        url = $helpers.buildUrl(url, {
                            dateRangeFrom: ISODateService.toStartOfDayStringWithZone(startDate),
                            dateRangeTo: ISODateService.toStartOfNextDayStringWithZone(endDate),
                            utcOffset: ISODateService.getOffsetFromUTC(),
                            programName: programName || ''
                        });

                        User.getCurrentUser().then(function() {
                            $window.open(url, '_blank');
                        });
                    };

                Modal.simpleDialog(
                    lwcI18nFilter('resultsByAssignment.exportScores.modalTitle'),
                    lwcI18nFilter('resultsByAssignment.exportScores.message'),
                    {
                        OK: {
                            title: lwcI18nFilter('resultsByAssignment.exportScores.action.export'),
                            handler: function() {
                                exportData(ReportService.currentProgram);
                            },
                            isDefault: true
                        },
                        CANCEL: {
                            title: lwcI18nFilter('resultsByAssignment.exportScores.action.cancel')
                        }
                    },
                    {
                        id: 'export_scores_modal'
                    }
                );
            };

            $scope.filters = ReportService.getReportFilters() || {
                program: null
            };

            $scope.$watchCollection('dateRange', function(newVal) {
                $log.debug('dateRange: ', newVal);
                if (newVal.startDate && newVal.endDate) {
                    var datePickerFormat = 'MM/DD/YYYY';

                    $scope.filters.startDate = moment(newVal.startDate).format(datePickerFormat);
                    $scope.filters.endDate = moment(newVal.endDate).format(datePickerFormat);
                }
            });

            $scope.reportData = {
                mastery: null,
                progress: null,
                usage: null
            };

            // on filter change, update report data
            var filterUpdated = function() {
                $log.debug('filterUpdate', $scope.filters);

                if (!$scope.filters.endDate || !$scope.filters.startDate) { return; }

                $scope.pageLoading();
                ReportService.setReportFilters($scope.filters);
                $q.all([
                    ReportService.getMasteryReport(
                        $scope.currentRoster.classId, $scope.filters.startDate, $scope.filters.endDate),
                    ReportService.getProgressReport(
                        $scope.currentRoster.classId, $scope.filters.startDate, $scope.filters.endDate),
                    ReportService.getUsageReport(
                        $scope.currentRoster.classId, $scope.filters.startDate, $scope.filters.endDate)
                ]).then(function(result) {
                    var masteryResult = result[0],
                        progressResult = result[1],
                        usageResult = result[2],
                        programList = masteryResult.programList.concat(progressResult.programList);

                    _.map(programList, function(val) {
                        if (val === 'NO_PROGRAM') {
                            return null;
                        }
                        return val;
                    });

                    $scope.programList = _.uniq(programList);
                    var programFilterIndex = $.inArray($scope.filters.program, $scope.programList);
                    if (programFilterIndex === -1) {
                        $scope.progIndex = -1;
                        $scope.reportData.mastery = masteryResult;
                        $scope.reportData.progress = progressResult;
                        $scope.reportData.usage = usageResult;
                    } else {
                        $scope.progIndex = programFilterIndex;
                        $scope.reportData.mastery = _.filter(masteryResult, function(r) {
                            return r.programs.length === 1 && r.programs[0] === $scope.filters.program;
                        });
                        $scope.reportData.progress = _.filter(progressResult, function(r) {
                            return r.programs.length === 1 && r.programs[0] === $scope.filters.program;
                        });
                        $scope.reportData.usage = _.filter(usageResult, function(r) {
                            return r.programs.length === 1 && r.programs[0] === $scope.filters.program;
                        });
                    }
                    $log.log('Report data set to', $scope.reportData);

                    $scope.pageLoaded();
                });
            };

            $scope.$watch('filters.startDate + filters.endDate', function(newDate, oldDate) {
                if (newDate !== oldDate) {
                    $log.log('Date filter watch', newDate, oldDate);
                    Analytics.track('track.action', {
                        category: 'Data',
                        action: 'Change Calendar Range'
                    });
                    filterUpdated();
                }
            });

            // update with program selection
            $scope.$watch('filters.program', function(program, old) {
                $log.log('selectedProgram watch', program, old);
                ReportService.currentProgram = program;
                filterUpdated();
            });

            $scope.hasReportData = function() {
                // If all three are empty, then do not show the link
                return !(_.isEmpty($scope.reportData.mastery) && _.isEmpty($scope.reportData.progress) &&
                    _.isEmpty($scope.reportData.usage));
            };

            $scope.back = function() {
                $rootScope.back('/data', true);
            };

            $scope.showBackNavigation = function() {
                return !locationUtilService.isDeeplinkDataTabActive();
            };
            if (locationUtilService.isDeeplinkDataTabActive()) {
                $rootScope.hideFooter = true;
            }
            $scope.$on('$viewContentLoaded', function() {
                $timeout(function() {
                    if (locationUtilService.isDeeplinkDataTabActive()) {
                        var body = document.body,
                            html = document.documentElement;
                        var height = Math.max(body.scrollHeight, body.offsetHeight,
                            html.clientHeight, html.scrollHeight, html.offsetHeight);
                        var payload = { resize_height: height };
                        penpalService.connectToParent().then(function(connection) {
                            connection.parent.exec('RESIZE_PAGE', payload);
                        });
                    }
                }, 1000);
            });
        }
    ]);
