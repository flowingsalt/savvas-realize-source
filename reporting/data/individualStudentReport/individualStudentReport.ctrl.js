angular.module('Realize.reporting.data.IndividualStudentReportCtrl', [
    'RealizeDataServices',
    'Realize.reporting.MasteryByStandardReport',
    'Realize.reporting.ReportService',
    'Realize.common.tourGuide',
    'rlzComponents.components.i18n',
    'Realize.standards.standardDataService',
    'Realize.common.mediaQueryService',
    'Realize.navigationService',
    'rlzComponents.components.masteryByStandardTelemetryWorker'
])
    .config([
        'AnalyticsProvider',
        function(AnalyticsProvider) {
            'use strict';

            AnalyticsProvider.addTracker('track.scoresByStandard', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    GoogleAnalytics.trackEvent('Data', 'Scores by Standard', AnalyticsEvent.label);
                }
            ]);
        }
    ])
    .controller('IndividualStudentReportCtrl', [
        '$log',
        'RosterData',
        '$routeParams',
        '$scope',
        'IndividualStudentReport',
        '$location',
        '$route',
        'ReportService',
        'MasteryByStandardReport',
        'Standard',
        '$interpolate',
        'Analytics',
        'Modal',
        'lwcI18nFilter',
        'BrowserInfo',
        'MediaQuery',
        'masteryByStandardTelemetryWorker',
        'NavigationService',
        'locationUtilService',
        function($log, RosterData, $routeParams, $scope, IndividualStudentReport,
            $location, $route, ReportService, MasteryByStandardReport, Standard,
            $interpolate, Analytics, Modal, lwcI18nFilter, BrowserInfo, MediaQuery, masteryByStandardTelemetryWorker,
            Navigation, locationUtilService) {
            'use strict';

            $scope.secondarySort = '+standardCode';
            $scope.sortOption = '+studentRecord.percentAsDecimal';
            $scope.sortPredicate = [$scope.sortOption, $scope.secondarySort];
            $scope.masteryStandardData = IndividualStudentReport;
            $scope.hasStudentRecord = IndividualStudentReport.hasStudentRecord;
            $scope.studentId = $routeParams.studentId;
            $scope.studentList = $scope.currentRoster.students; //TODO: Replace with report result, to be implemented...
            $scope.selectedStudent = _.findWhere($scope.studentList, {'userId': $scope.studentId});
            $scope.programName = IndividualStudentReport.selectedProgramName;
            $scope.standardsLibraryFullPath = IndividualStudentReport.selectedStandardLibraryId;
            $scope.isIDevice = BrowserInfo.isIDevice;
            $scope.isDesktop = MediaQuery.breakpoint.isDesktop;
            $scope.isMobileDevice = BrowserInfo.isMobileDevice;

            if (!$scope.selectedStudent) {
                //Student is removed from class, find it from report data, and fill in missing info
                var classId = $scope.currentRoster.classId,
                    reportDataStudent = MasteryByStandardReport.getRemovedStudent(classId);

                if (!reportDataStudent || reportDataStudent.userId !== $routeParams.studentId) {
                    reportDataStudent = _.findWhere($scope.masteryStandardData.studentInfoList, {
                        'studentId': $scope.studentId
                    }) || $scope.masteryStandardData.studentInfoList[0];
                }

                $scope.selectedStudent = MasteryByStandardReport.mockStudentUserFromReportData(
                    reportDataStudent, classId
                );

                $log.warn('Selected student not found in class, mocked using report data', $scope.selectedStudent);
            }

            $scope.studentName = $scope.selectedStudent.firstAndLast;

            $scope.locationFallback = '/data/' + $scope.currentRoster.classId + '/standards';

            $scope.standardInfo = IndividualStudentReport.standardInfoMapByStandardId;

            $scope.$on('masteryByStandard.filters.updated', function(event, newFilter) {
                $log.log('Filters updated', newFilter);
                if ($scope.studentId !== newFilter.selectedStudent.userId) {
                    //Update url
                    var path = $location.path(),
                        next = path.split('/students/')[0] + '/students/' + newFilter.selectedStudent.userId +
                            '/individualStudentReport';
                    $location.path(next).replace();
                } else {
                    //Reload for new data since filter is persisted
                    $route.reload();
                }
            });

            $scope.openResource = function(standard) {
                var deeplinkPrefix = '';
                $scope.$root.searchResultsTitle = ReportService.currentProgram;
                if (locationUtilService.isDeeplinkDataTabActive()) {
                    deeplinkPrefix = '/deeplink';
                }
                $location.path(deeplinkPrefix + '/search/standard/' + Standard.urlEncode(standard.standardFullTerm));
            };

            $scope.exportScores = function() {
                var exportData = function() {
                    var params = {
                        programName: $scope.programName,
                        standardsLibraryFullPath: $scope.standardsLibraryFullPath
                    };

                    MasteryByStandardReport.exportIndividualReport(
                        $scope.currentRoster.classId, $scope.studentId, params
                    );
                };
                Modal.simpleDialog(
                    lwcI18nFilter('individualStudentReport.export.modal.title'),
                    lwcI18nFilter('individualStudentReport.export.modal.message'),
                    {
                        OK: {
                            title: lwcI18nFilter('individualStudentReport.export.modal.action.export'),
                            handler: function() {
                                exportData();
                            },
                            isDefault: true
                        },
                        CANCEL: {
                            title: lwcI18nFilter('individualStudentReport.export.modal.action.cancel')
                        }
                    },
                    {
                        id: 'export_scores_modal'
                    }
                );
            };

            $scope.sortBy = function(newSortOption) {
                var currentOption = $scope.sortOption.split('.')[1],
                    currentOrder = $scope.sortOption.charAt(0),
                    newOrder = '+';

                if (newSortOption === currentOption && currentOrder === '+') {
                    newOrder = '-';
                }

                $scope.sortOption = newOrder + 'studentRecord.' + newSortOption;
                $scope.sortPredicate = [$scope.sortOption, $scope.secondarySort];
            };

            $scope.isSortingBy = function(option) {
                return $scope.sortOption.split('.')[1] === option;
            };

            $scope.goBack = function(locationFallback, isBackArrowClicked) {
                masteryByStandardTelemetryWorker.onGoBackToMasteryReportClick();
                if (locationUtilService.isDeeplinkDataTabActive()) {
                    Navigation.back('/deeplink' + $scope.locationFallback, isBackArrowClicked);
                } else {
                    Navigation.back($scope.locationFallback, isBackArrowClicked);
                }
            };

            $scope.getSortOrderClass = function() {
                return $scope.sortOption.charAt(0) === '+' ? 'down' : 'up';
            };

            $scope.$on('tour:close', function(ev, data) {
                var options = _.toArray($scope.tourOptions).length,
                    completedLabel = 'Individual Student: Tips Completed',
                    interruptedLabel = 'Individual Student: Tip' + data.stop + ' Display',
                    label = (data.stop === options) ? completedLabel : interruptedLabel;

                Analytics.track('track.masteryByStandard', {
                    label: label
                });
            });

            $scope.$on('tour:change', function(ev, data) {
                Analytics.track('track.scoresByStandard', {
                    label: 'Individual Student: Tip' + data.stop + ' Exit'
                });
            });

            var tourTemplate = $interpolate('<h3>{{ heading | lwcI18n }}</h3>{{ message | lwcI18n }}');

            $scope.tourOptions = {
                step1: tourTemplate({
                    heading: 'individualStudentReport.helpme.msg.step1.header',
                    message: 'individualStudentReport.helpme.msg.step1.msg'
                }),
                step2: tourTemplate({
                    heading: 'individualStudentReport.helpme.msg.step2.header',
                    message: 'individualStudentReport.helpme.msg.step2.msg'
                })
            };

            $scope.$on('window.breakpoint.change', function() {
                $scope.isDesktop = MediaQuery.breakpoint.isDesktop;
            });
        }
    ]);
