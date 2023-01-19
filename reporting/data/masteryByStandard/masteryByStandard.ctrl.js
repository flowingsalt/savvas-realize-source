angular.module('Realize.reporting.data.MasteryStandardCtrl', [
    'RealizeDataServices',
    'Realize.reporting.MasteryByStandardReport',
    'Realize.reporting.ReportService',
    'Realize.analytics',
    'Realize.common.mediaQueryService',
    'Realize.common.tourGuide',
    'Realize.standards.standardDataService',
    'Realize.standard.constants',
    'Realize.navigationService',
    'Realize.paths',
    'components.filters',
    'rlzComponents.components.sortArrow',
    'rlzComponents.components.standardsListModal',
    'rlzComponents.utilities.a11yElementLabel',
    'rlzComponents.routedComponents.itemAnalysis.table.stickyTop',
    'rlzComponents.components.masteryByStandardAccordion',
    'rlzComponents.components.masteryByStandardsFilter',
    'rlzComponents.components.masteryByStandardTelemetryWorker',
    'webStorageModule'
])
.config([
    'AnalyticsProvider',
    function(AnalyticsProvider) {
        'use strict';

        AnalyticsProvider.addTracker('track.masteryByStandard', [
            'GoogleAnalytics',
            'AnalyticsEvent',
            function(GoogleAnalytics, AnalyticsEvent) {
                GoogleAnalytics.trackEvent('Data', 'Mastery by Standard', AnalyticsEvent.label);
            }
        ]);
    }
])
.controller('MasteryStandardCtrl', [
    '$scope',
    '$window',
    'lwcI18nFilter',
    '$interpolate',
    '$location',
    '$rootScope',
    '$log',
    '$timeout',
    'RosterData',
    'MasteryByStandardReport',
    'ReportService',
    'Analytics',
    'Standard',
    'MASTERY_THRESHOLD',
    'Modal',
    'BrowserInfo',
    'MediaQuery',
    'STANDARD_CONSTANTS',
    'standardsListModal',
    'masteryByStandardTelemetryWorker',
    'PATH',
    'webStorage',
    'featureManagementService',
    'locationUtilService',
    'penpalService',
    'masteryByStandardDataService',
    function($scope, $window, lwcI18nFilter, $interpolate, $location, $rootScope, $log, $timeout, RosterData,
            MasteryByStandardReport, ReportService, Analytics, Standard, MASTERY_THRESHOLD,
            Modal, BrowserInfo, MediaQuery, STANDARD_CONSTANTS, standardsListModal,
            masteryByStandardTelemetryWorker, PATH, webStorage, featureManagementService,
            locationUtilService, penpalService, masteryByStandardDataService) {
        'use strict';
        $scope.isAssessmentMaintenancePageEnabled = featureManagementService.isAssessmentMaintenancePageEnabled();

        if ($scope.isAssessmentMaintenancePageEnabled) {
            return;
        }
        var hideInitialIntro = $scope.currentUser.getAttribute('masteryByStandard.hideInitialIntro');
        $scope.classId = $scope.currentRoster.classId;

        $scope.isHelpMeInterpretIsVisible = false;
        $scope.locationFallback = '/data';
        $scope.navigationFallback = '/data';
        $scope.currentRoster = RosterData;
        $scope.progIndex = -1;
        $scope.selectedStandardColumn = null;
        $scope.locale = $scope.currentUser.getAttribute('profile.locale') ?
        $scope.currentUser.getAttribute('profile.locale') : $window.systemLang;
        var fixedHeaderHeightValue = locationUtilService.isDeeplinkDataTabActive() ? 50 : 138;
        $scope.fixedHeaderHeight = BrowserInfo.isIDevice ? 0 : fixedHeaderHeightValue;
        $scope.isIDevice = BrowserInfo.isIDevice;
        $scope.isReload = true;
        $scope.assignmentIds = [];
        var updateStickyTopMaxWidth = function() {
            $scope.stickyTopMaxWidth = !MediaQuery.breakpoint.isDesktop ? 768 : 958;
        };
        updateStickyTopMaxWidth();
        $scope.allCategories = lwcI18nFilter('masteryByStandard.filter.allCategories');
        $scope.allAssignments = lwcI18nFilter('masteryByStandard.filter.allAssignments');
        $scope.allStandards = lwcI18nFilter('masteryByStandard.filter.allStandards');
        $scope.assessedStandards = lwcI18nFilter('masteryByStandard.filter.assessedStandards');

        $scope.helpMeInterpret = {
            smallScreenConfig: {
                landscapePosition: {
                    left: '48%'
                },
                potraitPosition: {
                    left: '31%'
                },
                arrow: {
                    left: '14%'
                },
                arrowStepFour: {
                    left: '13%'
                },
                arrowStepFive: {
                    left: '65%'
                },
            },
            normalScreenConfig: {
                position: {
                    left: '13%'
                },
                arrow: {
                    left: '14%'
                },
                arrowStepFour: {
                    left: '13%'
                },
                arrowStepFive: {
                    left: '42%'
                },
                positionStepFive: {
                    left: '48%'
                }
            }
        };

        // DO NOT modify this directly, use $scope.toggleAccordion
        $scope.accordionProperties = {
            expandedStudentId: null,
            selectedStandardId: null,
            isExpanded: function() {
                return !!$scope.accordionProperties.expandedStudentId;
            },
        };

        $scope.clickOrigin = {
            expandRow: 'expandRow',
            studentName: 'studentName',
            standardCell: 'standardCell',
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

        $scope.popOverPosition = BrowserInfo.isMobileDevice ?
            (MediaQuery.breakpoint.isDesktop ? $scope.helpMeInterpret.smallScreenConfig.landscapePosition :
                $scope.helpMeInterpret.smallScreenConfig.potraitPosition) :
                $scope.helpMeInterpret.normalScreenConfig.position;
        $scope.popOverPositionStepFive = BrowserInfo.isMobileDevice ?
            (MediaQuery.breakpoint.isDesktop ? $scope.helpMeInterpret.smallScreenConfig.landscapePosition :
                $scope.helpMeInterpret.smallScreenConfig.potraitPosition) :
                $scope.helpMeInterpret.normalScreenConfig.positionStepFive;
        $scope.arrowPosition = BrowserInfo.isMobileDevice ?
            $scope.helpMeInterpret.smallScreenConfig.arrow : $scope.helpMeInterpret.normalScreenConfig.arrow;
        $scope.arrowPositionStepFive = BrowserInfo.isMobileDevice ?
            $scope.helpMeInterpret.smallScreenConfig.arrowStepFive :
            $scope.helpMeInterpret.normalScreenConfig.arrowStepFive;
        $scope.arrowPositionStepFour = BrowserInfo.isMobileDevice ?
            $scope.helpMeInterpret.smallScreenConfig.arrowStepFour :
                       $scope.helpMeInterpret.normalScreenConfig.arrowStepFour;

        $scope.standardTruncationSettings = {
            characterLimit: STANDARD_CONSTANTS.STANDARD_TRUNCATION.CHARACTER_LIMIT,
            ellipsisAtBeginning: STANDARD_CONSTANTS.STANDARD_TRUNCATION.ELLIPSIS_AT_BEGINING
        };

        $scope.$on('tour:close', function(ev, data) {
            $scope.currentUser.setAttribute('masteryByStandard.hideInitialIntro', true);
            hideInitialIntro = true;

            var options = _.toArray($scope.tourOptions).length,
                label = (data.stop === options) ? 'Tips Completed' : 'Tip' + (data.stop) + ' Exit';
            Analytics.track('track.masteryByStandard', {
                label: label
            });
            focusOn.helpMeInterpretDataLink();
        });

        var focusOn = {
            element: function(selector) {
                var element = document.querySelector(selector);
                element.focus();
            },
            helpMeInterpretDataLink: function() {
                var selectorForHelpMeInterpretData = '#helpMeInterpretLink a';
                focusOn.element(selectorForHelpMeInterpretData);
                $scope.isHelpMeInterpretIsVisible = false;
            },
            firstStandardNameOnNextPageSet: function() {
                var selectorForNextSetOfStandardName = '.masteryByStandard__header__standardCode a';
                focusOn.element(selectorForNextSetOfStandardName);
            }
        };

        $scope.$on('tour:change', function(ev, data) {
            Analytics.track('track.masteryByStandard', {
                label: 'Tip' + data.stop + ' Display'
            });
        });

        var tourTemplate = $interpolate('<h3>{{ heading | lwcI18n }}</h3>{{ message | lwcI18n }}');
        // jscs:disable maximumLineLength
        var tourTemplateWithImage = $interpolate('<h3>{{ heading | lwcI18n }}</h3>{{ message | lwcI18n }} <img src={{ accordionImage }} alt="{{ ::altText | lwcI18n }}" class="masteryByStandard__helpMeInterpretTipFive"/>');
        // jscs:enable maximumLineLength

        $scope.tourOptions = {
                step1: tourTemplate({
                    heading: 'masteryByStandard.help.msg.step1.header',
                    message: 'masteryByStandard.help.msg.step1.msg'
                }),
                step2: tourTemplate({
                    heading: 'masteryByStandard.help.msg.step2.header',
                    message: 'masteryByStandard.help.msg.step2.msg'
                }),
                step3: tourTemplate({
                    heading: 'masteryByStandard.help.msg.step3.header',
                    message: 'masteryByStandard.help.msg.step3.msg'
                }),
                step4: tourTemplate({
                    heading: 'masteryByStandard.help.msg.step4.header',
                    message: 'masteryByStandard.help.msg.step4.msg'
                }),
                step5: tourTemplateWithImage({
                    heading: 'masteryByStandard.help.msg.step5.header',
                    message: 'masteryByStandard.help.msg.step5.msg',
                    accordionImage: PATH.IMAGES + '/masteryByStandard/image_tip.png',
                    altText: 'masteryByStandard.help.altText'
                })
            };

        $scope.reportParameters = {
            pageNumber: MasteryByStandardReport.getSavedStandardPageNumber($scope.classId),
            pageSize: !MediaQuery.breakpoint.isDesktop ? 3 : 5
        };

        // Adjust the perPage filter based on screen orientation
        $scope.$on('window.breakpoint.change', function bpChanged() {
            $scope.reportParameters.pageSize = !MediaQuery.breakpoint.isDesktop ? 3 : 5;
            updateStickyTopMaxWidth();
            correctPageNumberWithBreakPointChange();
        });

        var correctPageNumberWithBreakPointChange = function() {
            /**
             * We are checking the pageNumber * pageSize to see how much standards we can fit.
             * EndIndex will give us the index of the last standard. So when switching orientation,
             * say pageNumber is 13, pageSize is 5, then we would be able to fit 65 standards but
             * if we only have 36 standards, we are navigating till we reach pageNumber * pageSize = 40
             * since at that point, at the last page, standardNos 35 and 36 would be in the last page.
             * 40 would be the upperboundEndIndex, we are pagging till here because we would be displaying
             * at anytime pageSize(5 at this example) number of standards - bug: RGHT-82835
             */
            var upperboundEndIndexForPageSize =
                roundToUpperMultiplier($scope.standardReportPage.endIndex, $scope.reportParameters.pageSize);

            if ($scope.reportParameters.pageNumber * $scope.reportParameters.pageSize <=
                upperboundEndIndexForPageSize) {
                return;
            }
            while ($scope.reportParameters.pageNumber > 0 &&
                $scope.reportParameters.pageNumber * $scope.reportParameters.pageSize > upperboundEndIndexForPageSize) {
                $scope.previousPage();
            }
        };

        var roundToUpperMultiplier = function(number, divident) {
            // Log statement to debug any case where the loop doesn't end
            // which probably will not happen but just in case
            $log.debug('inside roundToUpperMultiplier');
            while (divident > 0 && number % divident !== 0) {
                number += 1;
            }

            return number;
        };

        var debouncedBreakpointChange = function() {
            _.debounce(function() {
                var currentStop = $scope.tourGuide.activeStop;
                $scope.tourGuide.reset();
                $scope.$apply();
                $scope.tourGuide.start(currentStop);
            }, { leading: false, trailing: true })();
        };

        // Adjust the perPage filter based on screen orientation
        $scope.$on('window.breakpoint.change', function toolTipChanged() {
            $scope.popOverPosition = !MediaQuery.breakpoint.isDesktop ?
                $scope.helpMeInterpret.smallScreenConfig.potraitPosition :
                $scope.helpMeInterpret.smallScreenConfig.landscapePosition;
            var isHelpMeInterpretPopoverVisible = angular.element('.popover-tour-guide').length;
            if (isHelpMeInterpretPopoverVisible) {
                debouncedBreakpointChange();
            }
        });

        $scope.standardFieldPrefernece = {
            sortField: STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.NAME,
            sortType: STANDARD_CONSTANTS.SORT_TYPE.ASC,
            standardProficiencySortType: STANDARD_CONSTANTS.SORT_TYPE.DESC,
        };

        var getStandardFieldPreference = function() {
            $scope.sortField.ascending = false;
            var storedSortPrefernece = webStorage.get(STANDARD_CONSTANTS.STANDARD_MASTERY_BY_CLASS +
                '.' + $scope.currentUser.userId + '.' + $scope.classId);
            $scope.standardFieldPrefernece = angular.extend($scope.standardFieldPrefernece, storedSortPrefernece);
            if ($scope.standardFieldPrefernece) {
                if ($scope.standardFieldPrefernece.sortType === STANDARD_CONSTANTS.SORT_TYPE.DESC) {
                    $scope.sortField.ascending = true;
                }
                if ($scope.standardFieldPrefernece.sortField === STANDARD_CONSTANTS.SORT_FIELD.NAME) {
                    $scope.sortField.identifier = STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.NAME;
                } else if ($scope.standardFieldPrefernece.sortField === STANDARD_CONSTANTS.SORT_FIELD.MASTERED) {
                    $scope.sortField.identifier = STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.PERCENT;
                }

                if ($scope.standardFieldPrefernece.standardProficiencySortType === STANDARD_CONSTANTS.SORT_TYPE.ASC) {
                    $scope.scoreSortedByDesc = false;
                }
            }

            if ($scope.scoreSortedByDesc) {
                $scope.scoreSortLabel = lwcI18nFilter('masteryByStandard.columnHeader.scoreLowToHigh');
            } else {
                $scope.scoreSortLabel = lwcI18nFilter('masteryByStandard.columnHeader.scoreHighToLow');
            }
        };

        var isStandardIdMatches = function(filteredStandard, standardMap) {
            return filteredStandard.standardId === standardMap.standardId;
        };

        var filterReportData = function(filters) {
            $scope.pageLoading();
            var filteredStandardList = $scope.masterStandardsList;
            var studentInfoMapById = angular.copy($scope.masterStandardInfoMap);
            $scope.isStandardAssessed = filters.isAssessedStandard;

            if (filters.isAssessedStandard) {
                filteredStandardList = filteredStandardList.filter(function(standard) {
                    return standard.assessed;
                });
            }
            $scope.standardList = filteredStandardList;

            angular.forEach(studentInfoMapById, function(standardMap, index) {
                if (!filteredStandardList.some(function(filteredStandard) {
                    return isStandardIdMatches(filteredStandard, standardMap);
                })) {
                    delete studentInfoMapById[index];
                }
            });
            $scope.standardInfoMapByStandardId = studentInfoMapById;
            closeAccordion();
            updateStickyTopWidth();
            var sortField = $scope.standardFieldPrefernece.sortField === STANDARD_CONSTANTS.SORT_FIELD.MASTERED ?
                STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.PERCENT : STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.NAME;
            getStandardFieldPreference();
            $scope.standardList = MasteryByStandardReport
                .sortStandardInfoMapByPercentageOrder($scope.standardInfoMapByStandardId, $scope.scoreSortedByDesc);
            $scope.sortBy(sortField, false);
            $scope.reportParameters.standardList = $scope.standardList;
            $scope.standardReportPage = MasteryByStandardReport.getReportPage(
                1, $scope.standardList.length, $scope.standardList
            );
            $scope.pageLoaded();
        };

        // on filter change, update report data
        var filterUpdated = function(filters) {
            $scope.pageLoading();

            MasteryByStandardReport
                .getReport($scope.classId, filters, $scope.currentUser.userId)
                .then(
                    function(result) { // Success
                        $scope.hasData = true;
                        $scope.statusCode = result.statusCode;
                        $scope.studentList = result.studentInfoList;
                        $scope.programName = result.selectedProgramName;
                        $scope.programList = _.uniq(result.programNames);
                        $scope.standardLibraries = result.standardLibraries;
                        $scope.standardInfoMapByStandardId = result.standardInfoMapByStandardId;
                        getStandardFieldPreference();
                        $scope.standardList = MasteryByStandardReport
                            .sortStandardInfoMapByPercentageOrder(result.standardInfoMapByStandardId,
                                $scope.scoreSortedByDesc);
                        $scope.standardsLibraryFullPath = result.selectedStandardLibraryId;
                        $scope.masterStandardsList = angular.copy($scope.standardList);
                        $scope.masterStandardInfoMap = angular.copy($scope.standardInfoMapByStandardId);
                        //Get current list
                        $scope.standardReportPage = MasteryByStandardReport.getReportPage(
                            filters.pageNumber, filters.pageSize, $scope.standardList
                        );

                        $scope.selectedLibrary = _.find($scope.standardLibraries, function(lib) {
                            return lib.standardFullTerm === $scope.standardsLibraryFullPath;
                        });

                        if (!hideInitialIntro && $scope.hasData && $scope.studentList.length) {
                            $timeout(function() {
                                $scope.tourGuide.start();
                            }, 100);
                        }
                        //Update filter
                        $scope.masteryStandardData = result;
                        $scope.showSorting = $scope.studentList.length > 1;
                        var isSortArrowClicked = false;
                        $scope.sortBy($scope.sortField.identifier, isSortArrowClicked);

                        var newFilter = angular.copy(filters) || {};
                        $scope.assignmentIds =
                            (angular.isDefined(filters.assignmentIds) && filters.assignmentIds.length > 0) ?
                            filters.assignmentIds : [];
                        $scope.isStandardAssessed = newFilter.isAssessedStandard =
                            (angular.isDefined(filters.isAllStandards) && !filters.isAllStandards);
                        $scope.contentCategory =
                            (!angular.isDefined(filters.isAllContentCategory) || filters.isAllContentCategory) ?
                                $scope.allCategories : filters.contentCategory;
                        $scope.assignmentTitle =
                            (!angular.isDefined(filters.isAllAssignment) || filters.isAllAssignment) ?
                                $scope.allAssignments :
                                $scope.masteryStandardData.assignmentIdAndTitleMap[filters.assignmentId];
                        $scope.isAllAssignment = newFilter.isAllAssignment;
                        if (newFilter.isAssessedStandard) {
                            filterReportData(newFilter);
                        }

                        // set program name for telemetry events to use
                        masteryByStandardTelemetryWorker.setProgramName($scope.programName);
                    },
                    function(error) { // Error
                        $scope.hasData = false;
                        $log.debug('MasteryByStandardReport.then error', error);
                        error.data = error.data || {};
                        $scope.statusCode = error.data.errorCode;
                        $scope.standardLibraries = [];
                    }
                )
                .finally(function(result) {
                    $log.debug('MasteryByStandardReport.finally', result);
                    $scope.selectedStandardColumn = null;
                    updateStickyTopWidth();
                    $scope.pageLoaded();
                });
        };

        $scope.$on('masteryByStandard.filters.updated', function(event, emittedFilter) {
            $log.log('Filter updated:', emittedFilter);
            $scope.assignmentIds = [];
            var newFilter = {
                programName: emittedFilter.programName,
                standardsLibraryFullPath: emittedFilter.selectedLibrary ?
                    emittedFilter.selectedLibrary.standardFullTerm : null,
                pageNumber: 1,
                pageSize: $scope.reportParameters.pageSize,
                isAssessedStandard: emittedFilter.isAssessedStandard,
                contentCategory: emittedFilter.selectedContentCategory,
                assignmentId: emittedFilter.selectedAssignmentId,
                assignmentTitle: emittedFilter.selectedAssignmentTitle,
                isAllStandards: !emittedFilter.isAssessedStandard,
                isAllContentCategory: emittedFilter.selectedContentCategory === $scope.allCategories,
                isAllAssignment: emittedFilter.selectedAssignmentTitle === $scope.allAssignments,
            };

            $scope.reportParameters.pageNumber = 1;
            $scope.isReload = emittedFilter.isReload;
            getContentCategoryAndAssignment(newFilter);
            if ($scope.isReload) {
                filterUpdated(newFilter);
            } else {
                filterReportData(newFilter);
            }
        });

        var getContentCategoryAndAssignment = function(newFilter) {
            switch (true) {
                case !newFilter.isAllContentCategory && !newFilter.isAllAssignment:
                    $scope.contentCategory = newFilter.contentCategory;
                    $scope.assignmentIds = newFilter.assignmentId;
                    break;
                case !newFilter.isAllContentCategory && newFilter.isAllAssignment:
                    $scope.contentCategory = newFilter.contentCategory;
                    break;
                case newFilter.isAllContentCategory && !newFilter.isAllAssignment:
                    $scope.assignmentIds = newFilter.assignmentId;
                    break;
                case newFilter.isAllAssignment && newFilter.isAllContentCategory:
                    $scope.contentCategory = newFilter.contentCategory;
                    break;
            }
            if (angular.isDefined($scope.assignmentIds) && $scope.assignmentIds.length > 0) {
                newFilter.assignmentIds = $scope.assignmentIds;
            }
            if (angular.isDefined(newFilter.contentCategory)) {
                newFilter.contentCategory = $scope.contentCategory;
            }
        };

        //horizontal scrolling standard list
        $scope.$watchCollection('reportParameters', function(params, old) {
            $log.log('params watch', params, old);
            if ($scope.standardList && $scope.standardReportPage &&
                ($scope.standardReportPage.pageNumber !== params.pageNumber ||
                $scope.standardReportPage.pageSize !== params.pageSize)) {
                MasteryByStandardReport.saveStandardPageNumber(
                    $scope.classId, $scope.reportParameters.pageNumber
                );
                $scope.standardReportPage = MasteryByStandardReport.getReportPage(
                    params.pageNumber, params.pageSize, $scope.standardList
                );
                $scope.setSelectedStandardColumn(null);
                $scope.updateStandardReportPageListToFitDisplayPageSize();
            }
        });

        //Init
        var savedFilters = MasteryByStandardReport.getSavedFilterOptions(
            $scope.currentUser, $scope.classId
        );
        angular.extend(savedFilters, $scope.reportParameters);
        $scope.scoreSortedByDesc = true;
        $scope.scoreSortLabel = lwcI18nFilter('masteryByStandard.columnHeader.scoreLowToHigh');
        filterUpdated(savedFilters);

        // Update a .standard column as (un)selected
        $scope.setSelectedStandardColumn = function(standard) {
            if ($scope.selectedStandardColumn !== standard) {
                $scope.selectedStandardColumn = standard;
                Analytics.track('track.masteryByStandard', {
                    label: 'View Standard Details'
                });
            } else {
                $scope.selectedStandardColumn = null;
            }
        };

        $scope.showStandardsListModal = function($event, standard) {
            /**
             * @param {jQueryEventObject} $event - JQuery event from which standard model was triggered from
             * @param {object} standard - The standard which was selected
             */
            // jscs:disable maximumLineLength
            var heading = lwcI18nFilter('teacherItemAnalysis.columnHeader.standard') + ' ' + standard.standardTerm;
            // jscs:enable maximumLineLength
            standardsListModal.activate({
                headerText: heading,
                standardsList: [standard],
                beforeViewResoucesRedirect: function(standard) {
                    masteryByStandardTelemetryWorker.onViewResources(standard.standardTerm);
                },
                closeAction: function() {
                    standardModalCloseAction($event.currentTarget);
                },
            });
            masteryByStandardTelemetryWorker.onStandardInfoButton();
        };
        var standardModalCloseAction = function(sourceElement) {
            /**
             * @param {jQuery} sourceElement - JQuery element from which standard model was triggered from
             */
            sourceElement.focus();
        };
        // Show the resources associated with the selected .standard
        $scope.searchByStandard = function(standardPath) {
            $scope.$root.searchResultsTitle = ReportService.currentProgram;
            $location.path('/search/standard/' + Standard.urlEncode(standardPath));
        };

        // A student's score for a .standard has been selected, so show a dialog of the associated assignments
        $scope.showAssignmentsByStudentStandard = function(studentId, standardId) {
            $log.debug('selectStudentStandard', studentId, standardId);
            Analytics.track('track.masteryByStandard', {
                label: 'Standard to Assessment Drilldown'
            });
        };

        // A simple test to see if a specific standard is shown on the current page/view
        var isStandardOnPage = function(standardId) {
            return _.find($scope.standardReportPage.list, function(standard) {
                    return standard.standardId === standardId;
                });
        };

        // Get row's class(es) based on that student's standard's score
        $scope.studentScoreCssClass = function(student) {
            var maxLength = 5,
                standards = student.standardInfoMapByStandardId,
                exceedsLength, achievedLength, possibleLength;

            exceedsLength = _.find(standards, function(standard) {
                achievedLength = standard.pointsAchieved.toString().length;
                possibleLength = standard.pointsPossible.toString().length;

                return (achievedLength > maxLength || possibleLength > maxLength) &&
                    isStandardOnPage(standard.standardId);
            });

            return exceedsLength ? 'smallerScores' : '';
        };

        // Get .standard column's span class(es) based on that student's standard's score
        $scope.standardScoreCssClass = function(standard) {
            var percent = standard ? standard.pointsAchieved / standard.pointsPossible : 0;
            return 'masteryByStandard__standard--color' +
                (!standard ? STANDARD_CONSTANTS.STANDARD_SCORE_COLOR.SKIP : (percent < MASTERY_THRESHOLD ?
                STANDARD_CONSTANTS.STANDARD_SCORE_COLOR.FAIL : STANDARD_CONSTANTS.STANDARD_SCORE_COLOR.PASS));
        };

        // Used by the zero-states
        $scope.gotoPrograms = function() {
            if (locationUtilService.isDeeplinkDataTabActive()) {
                var programUrl = featureManagementService.isShowBrowseTopnavEnabled() ?
                    '/dashboard/program' : '/community/program';
                $window.parent.location.href = $window.location.protocol +
                    '//' + $window.location.hostname + programUrl;
            } else {
                $location.path('/program');
            }
        };

        $scope.retryDataCall = function() {
            filterUpdated(savedFilters);
        };

        $scope.goToIndividualReport = function(student) {
            masteryByStandardTelemetryWorker.onMasteryScoreClick(student.percentageMasteredForStandardsLibrary);
            var deeplinkPrefix = locationUtilService.isDeeplinkDataTabActive() ? '/deeplink' : '';
            var url = deeplinkPrefix +
                '/data/' + $scope.classId + '/standards/students/' + student.studentId + '/individualStudentReport';
            $location.path(url);
        };

        $scope.helpMeInterpretStart = function() {
            masteryByStandardTelemetryWorker.onHelpMeInterpretClick();
            $scope.isHelpMeInterpretIsVisible = true;
        };

        $scope.$on('tour:next', function() {
            masteryByStandardTelemetryWorker.onNextOrPrevTipClick('next');
        });

        $scope.$on('tour:previous', function() {
            masteryByStandardTelemetryWorker.onNextOrPrevTipClick('previous');
        });

        var getSortType = function() {
            return ($scope.studentList.length > 1 && $scope.sortField.ascending === true) ?
                STANDARD_CONSTANTS.SORT_TYPE.ASC : STANDARD_CONSTANTS.SORT_TYPE.DESC;
        };

        var getSortField = function() {
            return ($scope.studentList.length > 1 &&
                $scope.sortField.identifier === STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.STANDARD) ?
                    $scope.sortAppliedStandardId : $scope.sortField.identifier;
        };

        var getAssignmentIds = function() {
            if (!$scope.isAllAssignment) {
                return $scope.assignmentIds;
            }
        };

        $scope.openExportModal = function() {
            masteryByStandardTelemetryWorker.onExportButton({
                numberOfStudents: dataForTelemetry.getNumberOfStudents(),
                numberOfStandards: dataForTelemetry.getNumberOfStandards()
            });
            var exportData = function() {
                var params = {
                    programName: $scope.programName,
                    standardsLibraryFullPath: $scope.standardsLibraryFullPath,
                    isStandardAssessed: $scope.isStandardAssessed ? $scope.isStandardAssessed : false,
                    contentCategory: $scope.contentCategory ?
                        $scope.contentCategory : $scope.allCategories,
                    assignmentTitle: $scope.assignmentTitle ?
                        $scope.assignmentTitle : $scope.allAssignments,
                    assignmentIds: getAssignmentIds(),
                    sortField: getSortField(),
                    sortType: getSortType(),
                    standardProficiencySortType: $scope.standardFieldPrefernece.standardProficiencySortType
                };
                MasteryByStandardReport.exportClassReport($scope.currentRoster.classId, params);
            };
            Modal.simpleDialog(
                lwcI18nFilter('masteryByStandard.export.modal.title'),
                lwcI18nFilter('masteryByStandard.export.modal.message'),
                {
                    OK: {
                        title: lwcI18nFilter('masteryByStandard.export.modal.action.export'),
                        handler: function() {
                            exportData();
                        },
                        isDefault: true
                    },
                    CANCEL: {
                        title: lwcI18nFilter('masteryByStandard.export.modal.action.cancel')
                    }
                },
                {
                    id: 'export_scores_modal'
                }
            );
        };

        $scope.getAriaLabelForMasteryHeaderCell = function(standard) {
            var textClassScore = lwcI18nFilter('masteryByStandard.heading.classScore');
            var isMasteredLabel = '';
            if (standard.mastered) {
                isMasteredLabel = lwcI18nFilter('masteryByStandard.heading.status.mastered');
            } else {
                isMasteredLabel = lwcI18nFilter('masteryByStandard.heading.status.notMastered');
            }
            return [standard.standardTerm, textClassScore,
                standard.percentageOfStudentsMastered, '%', isMasteredLabel].join(' ');
        };

        var dataForTelemetry = {
            getNumberOfStandards: function() {
                return $scope.standardList.length;
            },
            getNumberOfStudents: function() {
                return $scope.studentList.length;
            }
        };

        var startStandard = function() {
            $scope.startStandard = ($scope.reportParameters.pageNumber - 1) * $scope.reportParameters.pageSize;
            if (isNaN($scope.startStandard)) {
                $scope.startStandard = 0;
            }
        };
        startStandard();

        var updateStickyTopWidth = function() {
            setTimeout(function() {
                $scope.$broadcast('updateStickyTop', 'masteryByStandardTableHeader');
            }, 50);
        };

        $scope.nextPage = function() {
            $scope.reportParameters.pageNumber = $scope.reportParameters.pageNumber + 1;
            $scope.startStandard = $scope.startStandard + $scope.reportParameters.pageSize;
            updateStickyTopWidth();
            closeAccordion();
            $timeout(function() {
                /* requirement is after selecting the 'Next set of Standard' link reader should read the standard name
                on next page set, which takes some time to load the next set of standards */
                focusOn.firstStandardNameOnNextPageSet();
            }, 100);
        };

        $scope.previousPage = function() {
            $scope.reportParameters.pageNumber = $scope.reportParameters.pageNumber - 1;
            $scope.startStandard = $scope.startStandard - $scope.reportParameters.pageSize;
            updateStickyTopWidth();
            closeAccordion();
        };

        $scope.HEADER_IDENTIFIER = {
            name: STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.NAME,
            percent: STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.PERCENT,
            standard: STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.STANDARD,
            score: STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.SCORE
        };

        $scope.sortField = {
            identifier: $scope.HEADER_IDENTIFIER.name,
            ascending: false,
            standardIndex: -1
        };

        var isSortByStandard = function(identifier, standardIndex) {
            return Number(standardIndex) === $scope.sortField.standardIndex;
        };

        var isSortByColumn = function(identifier, standardIndex) {
            if (!angular.isDefined(standardIndex)) {
                return $scope.sortField.identifier === identifier;
            }
            return isSortByStandard(identifier, +standardIndex);
        };

        var isSortAscending = function(identifier, index) {
            return isSortByColumn(identifier, index) && $scope.sortField.ascending;
        };

        var isSortDescending = function(identifier, index) {
            return isSortByColumn(identifier, index) && !$scope.sortField.ascending;
        };

        var updateSortField = function(fieldName, standardNumber) {
            var standardIndex = Number(standardNumber);

            if (fieldName === $scope.HEADER_IDENTIFIER.standard) {
                if (standardIndex === $scope.sortField.standardIndex) {
                    $scope.sortField.ascending = !$scope.sortField.ascending;
                } else {
                    $scope.sortField.standardIndex = standardIndex;
                    $scope.sortField.ascending = true;
                }
            } else {
                $scope.sortField.standardIndex = -1;
                $scope.sortField.ascending = !$scope.sortField.ascending;
            }

            if (fieldName !== $scope.sortField.identifier) {
                $scope.sortField.identifier = fieldName;
                $scope.sortField.ascending = true;
                $scope.sortField.standardIndex = !isNaN(standardIndex) ? standardIndex : -1;
                return;
            }
        };
        var saveStandardFieldPreference = function(fieldName) {
            if (fieldName) {
                $scope.standardFieldPrefernece.sortType = STANDARD_CONSTANTS.SORT_TYPE.DESC;
                if ($scope.sortField.ascending && $scope.sortField.identifier === fieldName) {
                    $scope.standardFieldPrefernece.sortType = STANDARD_CONSTANTS.SORT_TYPE.ASC;
                }
                if (fieldName === STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.NAME) {
                    $scope.standardFieldPrefernece.sortField = STANDARD_CONSTANTS.SORT_FIELD.NAME;
                } else if (fieldName === STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.PERCENT) {
                    $scope.standardFieldPrefernece.sortField = STANDARD_CONSTANTS.SORT_FIELD.MASTERED;
                }
            } else {
                $scope.standardFieldPrefernece.standardProficiencySortType = STANDARD_CONSTANTS.SORT_TYPE.DESC;
                if (!$scope.scoreSortedByDesc) {
                    $scope.standardFieldPrefernece.standardProficiencySortType = STANDARD_CONSTANTS.SORT_TYPE.ASC;
                }
            }
            webStorage.add(STANDARD_CONSTANTS.STANDARD_MASTERY_BY_CLASS +
                '.' + $scope.currentUser.userId + '.' + $scope.classId, $scope.standardFieldPrefernece);
        };

        $scope.sortBy = function(fieldName, isSortArrowClicked, standardNumber, standard) {
            var standardId = standard !== undefined ? standard.standardId : undefined;
            $scope.sortAppliedStandardId = standardId;
            updateSortField(fieldName, standardNumber);
            if ((fieldName === $scope.HEADER_IDENTIFIER.name || fieldName === $scope.HEADER_IDENTIFIER.percent) &&
                isSortArrowClicked) {
                saveStandardFieldPreference(fieldName);
            }
            closeAccordion();

            $scope.studentList = $scope.studentList.sort(function(student1, student2) {
                var comparedResult;
                switch ($scope.sortField.identifier) {

                case $scope.HEADER_IDENTIFIER.name:
                    comparedResult = MasteryByStandardReport.nameComparator(student1, student2);
                    break;

                case $scope.HEADER_IDENTIFIER.percent:
                    comparedResult = MasteryByStandardReport.percentComparator(student1, student2,
                        $scope.sortField.ascending);
                    break;

                case $scope.HEADER_IDENTIFIER.standard:

                    var student1PointsInfo = student1.standardInfoMapByStandardId[standardId];
                    var student2PointsInfo = student2.standardInfoMapByStandardId[standardId];

                    // Number.NEGATIVE_INFINITY implies there is a dash in the standard score
                    var student1PointsOutOfPossible = student1PointsInfo !== undefined ?
                        student1PointsInfo.pointsAchieved / student1PointsInfo.pointsPossible :
                        Number.NEGATIVE_INFINITY;

                    var student2PointsOutOfPossible = student2PointsInfo !== undefined ?
                        student2PointsInfo.pointsAchieved / student2PointsInfo.pointsPossible :
                        Number.NEGATIVE_INFINITY;

                    if (student1PointsOutOfPossible === student2PointsOutOfPossible && $scope.sortField.ascending) {
                        comparedResult = (student1.lastFirst).toLowerCase() <
                            (student2.lastFirst).toLowerCase() ? -1 : 1;
                    } else if (student1PointsOutOfPossible === student2PointsOutOfPossible &&
                        !$scope.sortField.ascending) {
                        comparedResult = (student1.lastFirst).toLowerCase() >
                            (student2.lastFirst).toLowerCase() ? -1 : 1;
                    } else {
                        comparedResult = MasteryByStandardReport.standardComparator(student1, student2,
                            standardId);
                    }
                    break;
                }
                return comparedResult;
            });
            if (!$scope.sortField.ascending) {
                $scope.studentList.reverse();
            }
            if (isSortArrowClicked) {
                masteryByStandardTelemetryWorker.onSortColumn(fieldName, $scope.sortField.ascending, standard);
            }
        };

        $scope.getDirection = function(sortFieldName, standardIndex) {
            if (isSortDescending(sortFieldName, standardIndex)) {
                return STANDARD_CONSTANTS.DIRECTION.UP;
            } else if (isSortAscending(sortFieldName, standardIndex)) {
                return STANDARD_CONSTANTS.DIRECTION.DOWN;
            } else {
                return STANDARD_CONSTANTS.DIRECTION.DEFAULT;
            }
        };

        $scope.indexForNonStandardColumn = -1;

        $scope.getAriaSortTitle = function(identifier, index, standardTerm) {
            var outputArray = [];
            if (identifier === $scope.HEADER_IDENTIFIER.standard) {
                outputArray.push(standardTerm);
            } else if (identifier === $scope.HEADER_IDENTIFIER.name) {
                outputArray.push(lwcI18nFilter('masteryByStandard.columnHeader.name'));
            } else if (identifier === $scope.HEADER_IDENTIFIER.percent) {
                outputArray.push(lwcI18nFilter('masteryByStandard.columnHeader.percent'));
            } else if (identifier === $scope.HEADER_IDENTIFIER.score) {
                outputArray.push($scope.scoreSortLabel);
            }
            outputArray.push(lwcI18nFilter('teacherItemAnalysis.sorting.sortableColumn'));

            if (identifier === $scope.sortField.identifier && index === $scope.sortField.standardIndex) {
                if ($scope.sortField.ascending) {
                    outputArray.push(lwcI18nFilter('masteryByStandard.sorting.sortedAscending'));
                    outputArray.push(lwcI18nFilter('masteryByStandard.sorting.activateDescending'));
                } else {
                    outputArray.push(lwcI18nFilter('masteryByStandard.sorting.sortedDescending'));
                    outputArray.push(lwcI18nFilter('masteryByStandard.sorting.activateAscending'));
                }
            } else if (identifier === $scope.HEADER_IDENTIFIER.score) {
                if (!$scope.scoreSortedByDesc) {
                    outputArray.push(lwcI18nFilter('masteryByStandard.sorting.sortedAscending'));
                    outputArray.push(lwcI18nFilter('masteryByStandard.sorting.activateDescending'));
                } else {
                    outputArray.push(lwcI18nFilter('masteryByStandard.sorting.sortedDescending'));
                    outputArray.push(lwcI18nFilter('masteryByStandard.sorting.activateAscending'));
                }
            }  else {
                outputArray.push(lwcI18nFilter('masteryByStandard.sorting.activateAscending'));
            }

            return outputArray.join(', ');
        };

        $scope.getAriaLabelScore = function(student, standard) {
            var scoreAriaLabel = '';

            if ($scope.shouldDisplay.scoreForStandard(student, standard)) {
                scoreAriaLabel = lwcI18nFilter('masteryByStandard.heading.modal') + ' ' +
                standard.standardTerm + ' ' +
                lwcI18nFilter('infoSidePanel.score') + ' ' +
                student.standardInfoMapByStandardId[standard.standardId].pointsAchieved + ' ' +
                lwcI18nFilter('masteryByStandard.ariaLabelText.of') + ' ' +
                student.standardInfoMapByStandardId[standard.standardId].pointsPossible;
            } else {
                scoreAriaLabel = lwcI18nFilter('masteryByStandard.columnHeader.noData');
            }

            return scoreAriaLabel;
        };

        $scope.shouldDisplay = {
            errorMessageForEmptyStudentList : function() {
                var studentListIsEmpty = !$scope.studentList || !$scope.studentList.length;
                var standardLibraryIsNotEmpty = $scope.standardLibraries && Boolean($scope.standardLibraries.length);

                return $scope.hasData && studentListIsEmpty && standardLibraryIsNotEmpty;
            },
            errorMessageForEmptyStandardLibrary : function() {
                var standardLibraryIsEmpty = !$scope.standardLibraries || !$scope.standardLibraries.length;

                return $scope.hasData && standardLibraryIsEmpty;
            },
            accordionForStudent: function(studentId) {
                return studentId === $scope.accordionProperties.expandedStudentId;
            },

            expandedStandardIndicator: function(studentId, standardId) {
                return studentId === $scope.accordionProperties.expandedStudentId &&
                    standardId === $scope.accordionProperties.selectedStandardId;
            },
            scoreForStandard: function(studentObject, standardObject) {
                return studentObject.standardInfoMapByStandardId[standardObject.standardId];
            },
            standardDetails: function(standard) {
                // A true here means that the standard is an empty standard
                return standard.displayOrder !== -1;
            },
        };

        $scope.toggleAccordion = function(studentId, standardId, clickOrigin, score) {
            if (shouldCloseAccordion(studentId, standardId)) {
                var scoreObject = score ? score.score : undefined;
                masteryByStandardTelemetryWorker.onCloseAccordion(clickOrigin, scoreObject);
                closeAccordion();
                return;
            }

            $scope.accordionProperties.expandedStudentId = studentId;
            if (!standardId) {
                // standardId is undefined when user clicks on name or the down arrow, hence we find the
                // first standard id with a defined point achieved
                var studentObjectForSelectedStudent =
                    getStudentObjectForStudentId($scope.accordionProperties.expandedStudentId);
                var firstAvailableStandardObjectWithScore = getFirstStandardWithScore(studentObjectForSelectedStudent);
                if (!firstAvailableStandardObjectWithScore) {
                    $log.error('Cant find a standard with score for the selected student from standards ' +
                        'available in current standards page and beyond');
                    // closeAccordion();
                    standardId = null;
                } else {
                    standardId = firstAvailableStandardObjectWithScore.standardId;
                    masteryByStandardTelemetryWorker.onOpenAccordion(clickOrigin);
                }
            } else {
                masteryByStandardTelemetryWorker.onOpenAccordion(clickOrigin, score.score);
            }
            $scope.accordionProperties.selectedStandardId = standardId;
            var bindingData = {
                classId: $scope.classId,
                studentId: $scope.accordionProperties.expandedStudentId,
                programName: $scope.programName,
                standardId: $scope.accordionProperties.selectedStandardId
            };
            masteryByStandardDataService.setBindingData(bindingData);
        };

        var closeAccordion = function() {
            $scope.accordionProperties.expandedStudentId = null;
            $scope.accordionProperties.selectedStandardId = null;
        };

        var shouldCloseAccordion = function(selectedStudentId, selectedStandardId) {
            var shouldCloseAccordion = false,
                isAccordionExpanded = $scope.accordionProperties.isExpanded(),
                hasClickedOnExpandedStandard = selectedStandardId === $scope.accordionProperties.selectedStandardId,
                hasClickedOnExpandedStudentRow = selectedStudentId === $scope.accordionProperties.expandedStudentId,
                // hasClickedOnNameForAlreadyExpandedStudent also covers clicking on arrow to expand/close accordion
                hasClickedOnNameForAlreadyExpandedStudent = hasClickedOnExpandedStudentRow && !selectedStandardId;

            if (isAccordionExpanded && hasClickedOnNameForAlreadyExpandedStudent) {
                shouldCloseAccordion = true;
            } else if (isAccordionExpanded && hasClickedOnExpandedStudentRow && hasClickedOnExpandedStandard) {
                shouldCloseAccordion = true;
            }

            return shouldCloseAccordion;
        };

        var getStudentObjectForStudentId = function(studentId) {
            return $scope.studentList.find(function(student) {
                return student.studentId === studentId;
            });
        };

        var getFirstStandardWithScore = function(student) {
            if (!$scope.standardReportPage || !$scope.standardReportPage.list) {
                return;
            }

            var standardList = $scope.standardReportPage.list;
            return standardList.find(function(standard) {
                return student.standardInfoMapByStandardId[standard.standardId];
            });
        };

        $scope.getStandardsObjectFromStandardId = function(standardId) {
            return $scope.standardList
                    .find(function(standard) {
                return standard.standardId === standardId;
            });
        };

        $scope.updateSortFieldStandardIndex = function() {
            var isSortStandardMatched = false;
            if ($scope.sortAppliedStandardId) {
                for (var i = 0; i < $scope.standardReportPage.list.length; i++) {
                    if ($scope.standardReportPage.list[i].standardId === $scope.sortAppliedStandardId) {
                        isSortStandardMatched = true;
                        $scope.sortField.standardIndex = (($scope.reportParameters.pageNumber - 1) *
                            $scope.reportParameters.pageSize) + i;
                    }
                }
            }
            if (!isSortStandardMatched) {
                $scope.sortField.standardIndex = -1;
            }
        };

        $scope.updateStandardReportPageListToFitDisplayPageSize = function() {
            var numberOfStandardsToDisplay = $scope.standardReportPage.list.length;
            var isNoOfStandardsEqualToReportSizeDisplayed =
                numberOfStandardsToDisplay % $scope.reportParameters.pageSize === 0;
            $scope.updateSortFieldStandardIndex();
            if (numberOfStandardsToDisplay !== 0 && isNoOfStandardsEqualToReportSizeDisplayed) {
                return $scope.standardReportPage.list;
            }

            var numberOfEmptyStandardsNeeded = $scope.reportParameters.pageSize - numberOfStandardsToDisplay;
            var emptyStandardsToAppend = getEmptyStandards(numberOfEmptyStandardsNeeded);

            emptyStandardsToAppend.forEach(function(emptyStandard) {
                $scope.standardReportPage.list.push(emptyStandard);
            });
        };

        $scope.sortByScore = function() {
            $scope.startStandard = 0;
            $scope.scoreSortedByDesc = !$scope.scoreSortedByDesc;
            $scope.reportParameters.pageNumber = 1;
            saveStandardFieldPreference();
            $scope.standardList = MasteryByStandardReport
                .sortStandardInfoMapByPercentageOrder($scope.standardInfoMapByStandardId, $scope.scoreSortedByDesc);
            $scope.standardReportPage = MasteryByStandardReport.getReportPage(
                $scope.reportParameters.pageNumber, $scope.reportParameters.pageSize, $scope.standardList);
            if ($scope.scoreSortedByDesc) {
                $scope.scoreSortLabel = lwcI18nFilter('masteryByStandard.columnHeader.scoreLowToHigh');
            } else {
                $scope.scoreSortLabel = lwcI18nFilter('masteryByStandard.columnHeader.scoreHighToLow');
            }
            $scope.updateSortFieldStandardIndex();
            closeAccordion();
            updateStickyTopWidth();
        };

        $scope.showBackNavigation = function() {
           return !locationUtilService.isDeeplinkDataTabActive();
       };

        var getEmptyStandards = function(numberOfEmptyStandardsNeeded) {
            var emptyStandardsArray = [];

            _.times(numberOfEmptyStandardsNeeded, function() {
                var emptyStandard = __getEmptyStandard__();
                emptyStandardsArray.push(emptyStandard);
            });

            return emptyStandardsArray;
        };

        var __getEmptyStandard__ = function() {
            var randomId = 'dummy-standandard-id-' + _.random(100, 1000);
            var emptyStandard = {
                standardId: randomId,
                standardFullTerm: null,
                standardCode: null,
                description: null,
                spanishDescription: null,
                title: null,
                stateCode: null,
                standardTerm: null,
                percentageOfStudentsMastered: null,
                studentsMasteredCount: null,
                totalStudentsCount: null,
                // Using display order -1 to determine the need to hide UI elements for this standard
                displayOrder: -1,
                mastered: false,
                assessed: false,
            };

            return emptyStandard;
        };
    }
]);
