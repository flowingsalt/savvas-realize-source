angular.module('Realize.reporting.data.MasteryCtrl', [
    'RealizeDataServices',
    'Realize.reporting.MasteryByAssignmentService',
    'Realize.reporting.ReportService',
    'Realize.analytics',
    'Realize.common.mediaQueryService',
    'ModalServices',
    'Realize.navigationService',
    'Realize.assignment.constants',
    'Realize.standard.constants',
    'rlzComponents.components.myLibrary.constants',
    'rlzComponents.components.tabs',
    'rlzComponents.routedComponents.itemAnalysis',
    'components.filters',
    'rlzComponents.routedComponents.itemAnalysis.constants',
    'rlzComponents.components.itemAnalysis.itemAnalysisState',
    'rlzComponents.components.itemAnalysis.utilities',
    'rlzComponents.components.sortArrow'
    ])
    .config([
        'AnalyticsProvider',
        function(AnalyticsProvider) {
            'use strict';
            AnalyticsProvider.addTracker('track.masteryByAssignment', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    GoogleAnalytics.trackEvent('Data', 'Mastery by Assignment', AnalyticsEvent.label);
                }
            ]);
        }
    ])
    .controller('MasteryCtrl', [
        '$scope',
        '$window',
        '$routeParams',
        'TeacherAssignmentData',
        'ClassRosterData',
        'MasteryByAssignmentService',
        'GroupData',
        '$location',
        '$log',
        'Standard',
        '$filter',
        'Analytics',
        'ReportService',
        'MASTERY_THRESHOLD',
        '$rootScope',
        'NavigationService',
        'ReportData',
        'Modal',
        'MediaQuery',
        'cachedTableData',
        'lwcI18nFilter',
        'ITEM_ANALYSIS_CONSTANTS',
        '$timeout',
        'itemAnalysisStateService',
        'itemAnalysisUtilities',
        'AssignmentUtil',
        'breadcrumbTelemetryService',
        'BREADCRUMB_TELEMETRY_CONSTANTS',
        'ASSIGNMENT_CONSTANTS',
        'webStorage',
        'STANDARD_CONSTANTS',
        'MY_LIBRARY_CONSTANTS',
        'featureManagementService',
        'locationUtilService',
        'penpalService',
        function($scope, $window, $routeParams, TeacherAssignmentData, ClassRosterData,
            MasteryByAssignmentService, GroupData, $location, $log, Standard, $filter,
            Analytics, ReportService, MASTERY_THRESHOLD, $rootScope,
            NavigationService, ReportData, Modal, MediaQuery, cachedTableData, lwcI18nFilter,
            ITEM_ANALYSIS_CONSTANTS, $timeout, itemAnalysisStateService, itemAnalysisUtilities, AssignmentUtil,
            breadcrumbTelemetryService, BREADCRUMB_TELEMETRY_CONSTANTS, ASSIGNMENT_CONSTANTS, webStorage,
            STANDARD_CONSTANTS, MY_LIBRARY_CONSTANTS, featureManagementService, locationUtilService, penpalService) {
            'use strict';
            $scope.isAssessmentMaintenancePageEnabled = featureManagementService.isAssessmentMaintenancePageEnabled();
            if ($scope.isAssessmentMaintenancePageEnabled) {
                return;
            }
            var BROADCAST_INTERVEL_ITEM_ANALYSIS_INITAIALIZATION = 200;
            $scope.locationFallback = ['/data/', $routeParams.classId, '/overview'].join('');
            $scope.pageLoading();
            $scope.selectedStandardColumn = null;
            $scope.locale = $scope.currentUser.getAttribute('profile.locale') ?
                $scope.currentUser.getAttribute('profile.locale') : $window.systemLang;
            $scope.view = $routeParams.view;
            $scope.standardsList = null;
            $scope.tabsConfiguration = [];
            $scope.currentTab = 0;
            $scope.standardTruncationSettings = {
                characterLimit: ITEM_ANALYSIS_CONSTANTS.STANDARD_TAB.STANDARD_TRUNCATION.CHARACTER_LIMIT,
                ellipsisAtBeginning: ITEM_ANALYSIS_CONSTANTS.STANDARD_TAB.STANDARD_TRUNCATION.ELLIPSIS_AT_BEGINING,
            };
            $scope.isDeepLinked = false;
            $scope.isZeroState = false;
            // Exposing this filter in scope so that the template may directly use this filter in ternary operations
            // where normal filter openations are not supported - usage-ref: masteryByAssignmentTab.html
            $scope.lwcI18nFilter = lwcI18nFilter;
            $scope.sortedScoreByDesc = true;
            $scope.sortByScoreLabel = lwcI18nFilter('masteryRecap.columnHeader.sortScoreLowToHigh');
            $scope.$on('$destroy', function() {
                $log.log('cachedTableData: ', cachedTableData);
                cachedTableData.questions = cachedTableData.studentsTableData = null;
            });
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
            var sortName = {
                label: 'name',
            };
            var sortScore = {
                label: 'score',
            };
            var sortProficiency = {
                label: 'percentage',
            };
            $scope.HEADER_IDENTIFIER = {
                name: sortName.label,
                score: sortScore.label,
                proficiency: sortProficiency.label
            };
            var itemAnalysis = function() {
                $scope.scoresMap = ReportData;
                if ($window.itemAnalysisV2Enabled || $routeParams.itemAnalysisV2) {
                    $scope.isV2Enabled = true;
                } else if ($scope.scoresMap.isPAF) {
                    $scope.analysisTemplate = 'templates/partials/paf_item_analysis.html';
                } else {
                    $scope.analysisTemplate = 'templates/partials/nativeItemAnalysis.html';
                }
                $scope.openDialog = function(question, response, event) {
                    event.stopPropagation();
                    event.preventDefault();
                    if (response.count !== 0) {
                        var modalScope = $scope.$new(true);
                        modalScope.question = question;
                        modalScope.response = response;
                        modalScope.close = Modal.hideDialog;

                        Modal.showDialog('templates/partials/studentInfoDialog.html', modalScope);
                    }
                };
                $scope.showStudentsDialog = function(status, students, event) {
                    event.stopPropagation();
                    event.preventDefault();
                    if (students.length > 0) {
                        var modalScope = $scope.$new(true);
                        modalScope.status = status;
                        modalScope.students = students;
                        modalScope.close = Modal.hideDialog;

                        Modal.showDialog('templates/partials/student_paf_analysis_dialog.html', modalScope);
                    }
                };
                $scope.showCorrectStudents = function(question, event) {
                    $scope.showStudentsDialog('correct', question.studentsCorrect, event);
                };
                $scope.showIncorrectStudents = function(question, event) {
                    $scope.showStudentsDialog('incorrect', question.studentsIncorrect, event);
                };
                $scope.showPartialStudents = function(question, event) {
                    $scope.showStudentsDialog('partial', question.studentsPartial, event);
                };
            };
            itemAnalysis();
            $scope.masteryRecapView = function(view) {
                var location = $location.path().split('/').slice(0, -4);
                location.push(view);
                location.push($routeParams.filterStartDate);
                location.push($routeParams.filterEndDate);
                location.push($routeParams.assignmentIndex);
                NavigationService.replaceLocationWith(location.join('/'));
            };
            $scope.reportParameters = {
                pageNumber: MasteryByAssignmentService.getSavedStandardPageNumber($routeParams.classId),
                pageSize: !MediaQuery.breakpoint.isDesktop ? 3 : 5
            };
            $scope.$on('window.breakpoint.change', function() {
                $scope.reportParameters.pageSize = !MediaQuery.breakpoint.isDesktop ? 3 : 5;
                if (MediaQuery.breakpoint.isDesktop && $scope.standardsList.length <= 5) {
                    $scope.reportParameters.pageNumber = 1;
                }
                $scope.selectedStandardColumn = null;
            });

            var sortedStandards = function(isDescending) {
                $scope.sortedStandards = [];
                var sortedStandardsObject = MasteryByAssignmentService
                    .sortStandardsByPercentScore($scope.standardsByStudents, isDescending);
                angular.forEach(sortedStandardsObject, function(standard) {
                    angular.forEach($scope.standardsList, function(sortedStandard) {
                        if (sortedStandard.standardId === standard.standardId) {
                            $scope.sortedStandards.push(sortedStandard);
                        }
                    });
                });
            };

            $scope.sortByPercentage = function() {
                $scope.sortedScoreByDesc = !$scope.sortedScoreByDesc;
                $scope.reportParameters.pageNumber = 1;
                saveAssignmentFieldPreference();
                sortedStandards($scope.sortedScoreByDesc);
                $scope.standardAssignmentReportPage =
                    MasteryByAssignmentService.getReportPage($scope.reportParameters.pageNumber,
                        $scope.reportParameters.pageSize, $scope.sortedStandards);
                if ($scope.sortedScoreByDesc) {
                    $scope.sortByScoreLabel = lwcI18nFilter('masteryRecap.columnHeader.sortScoreLowToHigh');
                } else {
                    $scope.sortByScoreLabel = lwcI18nFilter('masteryRecap.columnHeader.sortScoreHighToLow');
                }
                $scope.selectedStandardColumn = null;
            };

            var processStudentStandardsTable = function() {
                var i;
                getAverageListResource();
                $scope.standardAssignmentReportPage =
                    MasteryByAssignmentService.getReportPage($scope.reportParameters.pageNumber,
                        $scope.reportParameters.pageSize, $scope.standardsList);
                angular.forEach($scope.standardsList, function(standard) {
                    var performanceObject = {},
                        avgStandardPercent,
                        passCount = 0,
                        totalCount = 0;
                    angular.forEach($scope.studentsList, function(student) {
                        for (i = student.standardsAverageReportList.length - 1; i >= 0; i--) {
                            var studentStandard = student.standardsAverageReportList[i];
                            if (studentStandard.standardId === standard.standardId) {
                                performanceObject[student.studentId] = {
                                    standardScore: [
                                        studentStandard.score.points,
                                        studentStandard.score.maxPoints
                                    ].join('/'),
                                    standardPercent: percentByPoints(studentStandard.score.points,
                                        studentStandard.score.maxPoints)
                                };

                                if (studentStandard.score.percentScore >= 70) {
                                    passCount++;
                                }
                                totalCount++;
                            }
                        }
                    });
                    avgStandardPercent = percentByPoints(passCount, totalCount);
                    this[standard.standardId] = {
                        students: performanceObject,
                        displayName: standard.number,
                        percentScore: avgStandardPercent,
                        standardId: standard.standardId
                    };
                }, $scope.standardsByStudents);
                sortedStandards($scope.sortedScoreByDesc);
                $scope.standardAssignmentReportPage =
                    MasteryByAssignmentService.getReportPage($scope.reportParameters.pageNumber,
                        $scope.reportParameters.pageSize, $scope.sortedStandards);
            };

            $scope.isStandardScoredByStudent = function(standard, student) {
                var studentStandard =
                    $scope.standardsByStudents[standard.standardId];
                return Boolean(student.score && studentStandard &&
                    studentStandard.students[student.studentId] &&
                    studentStandard.students[student.studentId].standardScore);
            };

            var getAssignmentFieldPreference = function() {
                $scope.sortField.ascending = false;
                var storedSortPrefernece = webStorage.get(STANDARD_CONSTANTS.STANDARD_MASTERY_BY_ASSIGNMENT + '.' +
                    $scope.currentUser.userId + '.' + $routeParams. classId + '.' +
                    $scope.assessment.assessmentId);
                $scope.assignmentFieldPreference = angular.extend($scope.assignmentFieldPreference,
                    storedSortPrefernece);
                if ($scope.assignmentFieldPreference) {
                    if ($scope.assignmentFieldPreference.sortType === STANDARD_CONSTANTS.SORT_TYPE.DESC) {
                        $scope.sortField.ascending = true;
                    }
                    if ($scope.assignmentFieldPreference.sortField === STANDARD_CONSTANTS.SORT_FIELD.NAME) {
                        $scope.sortField.identifier = STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.NAME;
                    } else if ($scope.assignmentFieldPreference.sortField === STANDARD_CONSTANTS.SORT_FIELD.SCORE) {
                        $scope.sortField.identifier = STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.SCORE;
                    }

                    if ($scope.assignmentFieldPreference.standardProficiencySortType ===
                        STANDARD_CONSTANTS.SORT_TYPE.ASC) {
                        $scope.sortedScoreByDesc = false;
                    }
                }

                if ($scope.sortedScoreByDesc) {
                    $scope.sortByScoreLabel = lwcI18nFilter('masteryRecap.columnHeader.sortScoreLowToHigh');
                } else {
                    $scope.sortByScoreLabel = lwcI18nFilter('masteryRecap.columnHeader.sortScoreHighToLow');
                }
            };

            var getStudentsList = function() {
                var ELLIPSES_NAME = ReportService.CONSTANTS.MASTERY_NAME_MAXLENGTH;
                ReportService.studentMastery(
                    $routeParams.classId,
                    $scope.assessment.assignmentId,
                    $scope.assessment.assessmentId
                ).then(function(response) {
                    $scope.studentsList = response.data;
                    // get standards list from student's average report list
                    angular.forEach($scope.studentsList, function(student) {
                        student.fullName = [student.studentLastName, student.studentFirstName].join(
                            ', ');
                        if (student.fullName.length > ELLIPSES_NAME) {
                            student.ellipsesName = $filter('ellipses')(student.fullName,
                                ELLIPSES_NAME);
                        }
                        var list = student.standardsAverageReportList;
                        if (list && list.length) {
                            $scope.standardsList = $scope.standardsList ?
                                $scope.getConcatenatedStandardsList($scope.standardsList, list) : list;
                            return;
                        }
                    });
                    $scope.standardAssignmentReportPage =
                        MasteryByAssignmentService.getReportPage($scope.reportParameters.pageNumber,
                            $scope.reportParameters.pageSize, $scope.standardsList);
                    $scope.showSorting = $scope.studentsList.length > 1;
                    getAssignmentFieldPreference();
                    var isPageLoading = true;
                    $scope.sortBy($scope.sortField.identifier, isPageLoading);
                    processStudentStandardsTable();
                }).finally(function() {
                    $scope.selectedStandardColumn = null;
                    $scope.setupTabsConfig();
                    /*
                     * the tabConfiguration[0], because we want to send telemetry event for the first tab
                     * deciding if question tab is first or standard tab is first is already available in
                     * setupTabConfig, and onClick function on tabConfig only has telemetry event
                     */
                    var currentTab = $location.search().selectedTab ? $location.search().selectedTab : 0;
                    currentTab =
                        $scope.tabsConfiguration[0].id !== ITEM_ANALYSIS_CONSTANTS.EVENT_TYPE.STANDARD_ANALYSIS &&
                        currentTab > 0 ? (currentTab - 1) : currentTab;
                    $scope.tabsConfiguration[currentTab].onClick();
                    $scope.pageLoaded();
                });
            };
            $scope.$watchCollection('reportParameters', function(params) {
                $scope.standardAssignmentReportPage =
                    MasteryByAssignmentService.getReportPage($scope.reportParameters.pageNumber,
                        $scope.reportParameters.pageSize, $scope.sortedStandards);
                var index = $scope.standardAssignmentReportPage.endIndex -
                    $scope.standardAssignmentReportPage.startIndex;
                if ($scope.standardsList && $scope.standardAssignmentReportPage &&
                    index === $scope.reportParameters.pageSize &&
                    ($scope.standardAssignmentReportPage.pageNumber !== params.pageNumber ||
                        $scope.standardAssignmentReportPage.pageSize !== params.pageSize)) {
                    MasteryByAssignmentService.saveStandardPageNumber(
                        $routeParams.classId, $scope.reportParameters.pageNumber
                    );
                    $scope.standardAssignmentReportPage = MasteryByAssignmentService.getReportPage(
                        params.pageNumber, params.pageSize,  $scope.sortedStandards
                    );
                    $scope.setSelectedStandardColumn(null);
                }
            });
            $scope.standardsByStudents = {};

            $scope.getConcatenatedStandardsList = function(masterStandardList, studentStandardList) {
                return _.uniq(studentStandardList.concat(masterStandardList), function(studentStandard) {
                    return studentStandard.standardId;
                });
            };

            var percentByPoints = function(points, maxPoints) {
                if (maxPoints === 0) {
                    return 0;
                }
                var percent = 100 * points / maxPoints;
                return Math.round(percent);
            };
            var telemetryWorker = {
                onStandardAnalysisTabClick: function() {
                    itemAnalysisUtilities.onStandardAnalysis($scope.studentsList.length, $scope.standardsList.length);
                },
                onQuestionTabClick: function() {
                    /*
                     * during the first broadcast, the question table is not initialized due to xhr latency
                     * and the $on is not regristered hence using a recursive function with
                     * timeout to re-try if its not initialized
                     */
                    if (itemAnalysisStateService.isQuestionTableInitialized) {
                        $scope.$broadcast(ITEM_ANALYSIS_CONSTANTS.BROADCAST_EVENTS.QUESTION_TAB_CLICKED);
                        return;
                    }
                    $timeout(telemetryWorker.onQuestionTabClick, BROADCAST_INTERVEL_ITEM_ANALYSIS_INITAIALIZATION);
                },
                onStudentTabClick: function() {
                    /*
                     * during the first broadcast, the student table is not initialized due to xhr latency
                     * and the $on is not regristered hence using a recursive function with
                     * timeout to re-try if its not initialized
                     */
                    if (itemAnalysisStateService.isStudentTableInitialized) {
                        $scope.$broadcast(ITEM_ANALYSIS_CONSTANTS.BROADCAST_EVENTS.STUDENT_TAB_CLICKED);
                        return;
                    }
                    $timeout(telemetryWorker.onStudentTabClick, BROADCAST_INTERVEL_ITEM_ANALYSIS_INITAIALIZATION);
                },
                onPerformanceTabClick: function() {
                }
            };
            $scope.setupTabsConfig = function() {
                $scope.tabsConfiguration = [];
                var v1Template = '<div ng-if="!isV2Enabled" class="sectionContent scores" ' +
                    'ng-include="analysisTemplate"></div>';
                var standardAnalysisReportConfiguration = {
                    label: lwcI18nFilter('masteryRecap.itemTabs.mastery'),
                    id: 'Standard Analysis',
                    templateUrl: 'templates/partials/masteryByAssignmentTab.html',
                    scope: $scope,
                    onClick: telemetryWorker.onStandardAnalysisTabClick,
                };
                var iaQuestionsReportConfiguration = {
                    label: lwcI18nFilter('masteryRecap.itemTabs.question'),
                    id: 'Question Analysis',
                    template: v1Template + '<item-analysis view="question"></item-analysis>',
                    scope: $scope,
                    onClick: telemetryWorker.onQuestionTabClick,
                };
                var iaStudentReportConfiguration = {
                    label: lwcI18nFilter('masteryRecap.itemTabs.student'),
                    id: 'Student Analysis',
                    template: v1Template + '<item-analysis view="student"></item-analysis>',
                    scope: $scope,
                    onClick: telemetryWorker.onStudentTabClick,
                };
                var iaPerformanceReportConfiguration = {
                    label: lwcI18nFilter('masteryRecap.itemTabs.performance'),
                    id: 'Performance Analysis',
                    template: v1Template + '<item-analysis students-list="studentsList"' +
                        '" view="performance"></item-analysis>',
                    scope: $scope,
                    onClick: telemetryWorker.onPerformanceTabClick,
                };
                if ($scope.standardsList && $scope.standardsList.length) {
                    $scope.tabsConfiguration.push(standardAnalysisReportConfiguration);
                }
                $scope.tabsConfiguration.push(iaQuestionsReportConfiguration);
                $scope.tabsConfiguration.push(iaStudentReportConfiguration);
                $scope.tabsConfiguration.push(iaPerformanceReportConfiguration);
            };
            $scope.setFocusOnDialog = function() {
                var element = document.getElementById('standardDetails');
                if (element) {
                    element.focus();
                }
            };
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
            var isStandardOnPage = function(standardId) {
                return _.find($scope.standardReportPage.list, function(standard) {
                    return standard.standardId === standardId;
                });
            };
            $scope.studentScoreCssClass = function(student) {
                var maxLength = 5,
                    standards = student.standardsAverageReportList,
                    exceedsLength, achievedLength, possibleLength;
                exceedsLength = _.find(standards, function(standard) {
                    achievedLength = standard.score.points.toString().length;
                    possibleLength = standard.score.maxPoints.toString().length;
                    return (achievedLength > maxLength || possibleLength > maxLength) &&
                        isStandardOnPage(standard.standardId);
                });
                return exceedsLength ? 'smallerScores' : '';
            };
            $scope.pageChange = function(offsetPage) {
                $scope.reportParameters.pageNumber =
                    $scope.reportParameters.pageNumber + offsetPage;
                $scope.selectedStandardColumn = null;
            };
            $scope.standardScoreCssClass = function(standardsByStudents) {
                var percent = standardsByStudents ? standardsByStudents.percentScore / 100 : 0;
                return 'color' + (!standardsByStudents ? 'Skip' : (percent < MASTERY_THRESHOLD ? 'Fail' :
                    'Pass'));
            };
            var switchAssessment = function() {
                var deeplinkPrefix = '';
                if (locationUtilService.isDeeplinkDataTabActive()) {
                    deeplinkPrefix = '/deeplink';
                }
                var path = deeplinkPrefix + '/data/' + $routeParams.classId + '/overview/assignment/' +
                    $scope.assessment.assignmentId + '/recap/' + $scope.assessment.assessmentId +
                    '/' + $scope.view + '/' + $routeParams.filterStartDate + '/' + $routeParams.filterEndDate +
                    '/' + $scope.assessmentIndex;
                NavigationService.replaceLocationWith(path);
            };

            $scope.prevAssessment = function() {
                var prevAssessment = 'Previous Assessment';
                var tabLabel = $scope.tabsConfiguration[$scope.currentTab].id;
                itemAnalysisUtilities.onAssessmentNavigation(
                    $scope.assessment.programHierarchy, prevAssessment, tabLabel
                );
                $scope.assessment = $scope.assessments[--$scope.assessmentIndex];
                switchAssessment();
            };

            $scope.nextAssessment = function() {
                var nextAssessment = 'Next Assessment';
                var tabLabel = $scope.tabsConfiguration[$scope.currentTab].id;
                itemAnalysisUtilities.onAssessmentNavigation(
                    $scope.assessment.programHierarchy, nextAssessment, tabLabel
                );
                $scope.assessment = $scope.assessments[++$scope.assessmentIndex];
                switchAssessment();
            };

            $scope.backNavigation = function() {
                var backUrl = $location.search().backUrl;
                if (!$scope.isZeroState) {
                    var tabLabel = $scope.tabsConfiguration[$scope.currentTab].id;
                    itemAnalysisUtilities.onBackNavigation($scope.assessment.programHierarchy, tabLabel);
                }
                if (!!backUrl) {
                    var url = decodeURIComponent(backUrl);
                    NavigationService.navigate(url);
                } else if ($scope.isDeepLinked && !backUrl) {
                    $scope.back(webStorage.get(ASSIGNMENT_CONSTANTS.DEEP_LINKED_URL), true);
                } else if (locationUtilService.isDeeplinkDataTabActive()) {
                    $scope.back('/deeplink' + $scope.locationFallback, true);
                } else {
                    $scope.back($scope.locationFallback, true);
                }
            };

            var getAverageListResource = function() {
                ReportService.averageMastery(
                    $routeParams.classId,
                    $scope.assessment.assignmentId,
                    $scope.assessment.assessmentId
                ).then(function(response) {
                    $scope.standardsListForResource = response.data;
                });
            };

            $scope.loadItemAnalysis = function() {
                var deeplinkPrefix = '';
                if (locationUtilService.isDeeplinkDataTabActive()) {
                    deeplinkPrefix = '/deeplink';
                }
                $location.path([deeplinkPrefix +
                    '/data/', $routeParams.classId, '/overview/assignment/', $routeParams.assignmentId,
                    '/assessment/', $scope.assessment.assessmentId, '/scoreSummary'
                ].join(''));
            };
            $scope.search = function(standard) {
                var deeplinkPrefix = '';
                if (locationUtilService.isDeeplinkDataTabActive()) {
                    deeplinkPrefix = '/deeplink';
                }
                $log.log('searching now', ReportService);
                $rootScope.searchResultsTitle = ReportService.currentProgram;
                $scope.keyStore.set('assessmentLanguage', $scope.selectedAssignment.contentItem.language);
                $location.path(deeplinkPrefix + '/search/standard/' + Standard.urlEncode(standard.fullTerm));
            };
            $scope.percentScore = function(standard) {
                if (standard.totalQuestions === 0) {
                    return 0;
                }
                var percent = 100 * standard.score.points / standard.score.maxPoints;
                return Math.round(percent);
            };
            $scope.averageScore = function() {
                if (!$scope.studentsList) {
                    return Math.round($scope.scoresMap.classAverageScore);
                }
                var scoreCount = 0;
                var sumOfScore = 0;
                for (var i = 0; i < $scope.studentsList.length; i++) {
                    if ($scope.studentsList[i].score !== null) {
                        sumOfScore = sumOfScore + $scope.studentsList[i].score.percentScore;
                        scoreCount++;
                    }
                }
                var averageScore = ((scoreCount === 0) ? '-' : ((sumOfScore / scoreCount)));
                return isNaN(averageScore) ? Math.round($scope.scoresMap.classAverageScore) : Math.round(averageScore);
            };
            $scope.selectedAssignment = TeacherAssignmentData;
            var assigneesName = $scope.selectedAssignment.$getAssigneesName(ClassRosterData, GroupData);
            $scope.selectedAssignment.assigneeList = [].concat(
                assigneesName.classes,
                assigneesName.groups,
                assigneesName.students
            );
            var getProgramHierarchy = function(assignment) {
                var updateAssignment = AssignmentUtil.getAssignmentWithProgramHierarchy(assignment);
                return updateAssignment.breadcrumb || [];
            };

            var fetchAssessmentTitle = function(itemUuid, content) {
                var found = false;
                if (content && content.contentItems) {
                    _.each(content.contentItems, function(contentItem) {
                        if (contentItem.id === itemUuid) {
                            $scope.requiredItem = contentItem;
                            found = true;
                        } else if (!found && contentItem.mediaType === MY_LIBRARY_CONSTANTS.LEARNING_MODEL) {
                            return fetchAssessmentTitle(itemUuid, contentItem);
                        }
                    });
                }
            };

            var getAssignmentTitle = function(itemUuid, content) {
                fetchAssessmentTitle(itemUuid, content);
                return $scope.requiredItem;
            };

            $scope.programHierarchy = getProgramHierarchy($scope.selectedAssignment);
            $scope.assigneeCommaSeparatedList = $scope.selectedAssignment.assigneeList.join(' | ');

            $scope.assignmentFieldPreference = {
                sortField: STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.NAME,
                sortType: STANDARD_CONSTANTS.SORT_TYPE.ASC,
                standardProficiencySortType: STANDARD_CONSTANTS.SORT_TYPE.DESC,
            };

            var firstRun = function() {
                $scope.assessments = ReportService.masteryReportList;
                // assignmentIndex is not present in routeParams if page is routed from data link in assignments
                if (!angular.isDefined($routeParams.assignmentIndex)) {
                    for (var index = 0; index < $scope.assessments.length; index++) {
                        if ($scope.assessments[index].assessmentId === $routeParams.assessmentId &&
                                $scope.assessments[index].assignmentId === $routeParams.assignmentId) {
                            $scope.assessmentIndex = index;
                            break;
                        }
                    }
                    // To hide roster drop down, menu
                    $rootScope.subnavState = 'hidden';
                    // To hide prev assignments and next assignments
                    $scope.isDeepLinked = true;
                } else {
                    $scope.assessmentIndex = $routeParams.assignmentIndex;
                }
                $scope.assessment = $scope.assessments[$scope.assessmentIndex];
                $scope.assessmentIndexlength = $scope.assessments.length - 1;

                $scope.getSearchTitle = function() {
                    var dueDate;
                    var assessmentTitle;
                    if (!$scope.assessment) {
                        dueDate = Date.parse($scope.selectedAssignment.dueDateLegible).toString('MM/dd/yy');
                        if ($scope.selectedAssignment.hasManualScore &&
                            $scope.selectedAssignment.contentItem.contentItems.length === 0) {
                            assessmentTitle =  $scope.selectedAssignment.contentItem.title;
                        } else {
                            assessmentTitle = getAssignmentTitle($routeParams.itemUuid,
                                $scope.selectedAssignment.contentItem).title;
                        }
                    } else {
                        dueDate = $scope.assessment.assignmentDueDate;
                        assessmentTitle = $scope.assessment.assessmentTitle;
                    }
                    return [dueDate , assessmentTitle].join(': ');
                };

                // if we can't find assessment, go back
                if (!$scope.assessment && $scope.assessmentIndex) {
                    return $scope.back($scope.locationFallback);
                } else if (!$scope.assessment && !$scope.assessmentIndex) {
                    $scope.isZeroState = true;
                    $scope.pageLoaded();
                    return;
                }
                var dueDate = Date.parse($scope.assessment.assignmentDueDate),
                    beforeDueDate = Date.today().isBefore(dueDate) && $scope.assessment.beforeDueDate !== false;

                $scope.assessment.beforeDueDate = beforeDueDate;
                // reformat date for display
                $scope.assessment.assignmentDueDate = dueDate.toString('MM/dd/yy');
                $scope.$watch('view', function() {
                    if ($scope.view === 'student') {
                        getStudentsList();
                    }
                });
            };

            var isAssessmentAvailableInMasteryList = function() {
                var isAssessmentIdExist = false;
                for (var i = 0; i < ReportService.masteryReportList.length; i++) {
                    if (ReportService.masteryReportList[i].assessmentId === $routeParams.assessmentId &&
                            ReportService.masteryReportList[i].assignmentId === $routeParams.assignmentId) {
                        isAssessmentIdExist = true;
                        break;
                    }
                }
                return isAssessmentIdExist;
            };

            if (!ReportService.masteryReportList.length || !isAssessmentAvailableInMasteryList()) {
                // Use the $routeParams for the date.
                // (should I fallback to using range from today to 30 days future?  ever happen?)
                // in the dates, replace the dashes - with slashes /.
                var startDate, endDate;

                if ($routeParams.filterStartDate && $routeParams.filterEndDate) {
                    startDate = $routeParams.filterStartDate.replace(/-/g, '/');
                    endDate = $routeParams.filterEndDate.replace(/-/g, '/');
                } else {
                    //TODO  remove this?
                    // not sure this could/should ever happen?  no routeParams?
                    // i guess wouldn't if removed from appRoutesTeacher.js
                    startDate = Date.today().addMonths(-1).toString('MM/dd/yyyy');
                    endDate = Date.today().addMonths(1).toString('MM/dd/yyyy');
                }

                ReportService.getMasteryReport($routeParams.classId, startDate, endDate).then(function() {
                    firstRun();
                });
            } else {
                firstRun();
            }

            $scope.breadcrumbHandler = function($event, url) {
                $event.stopPropagation();
                var breadcrumbItem = $event.currentTarget.text;
                var tabLabel = $scope.tabsConfiguration[$scope.currentTab].id;
                var subPageConstKey = tabLabel.replace(/ /g, '_').toUpperCase();
                var extensionKeys = {
                    page: BREADCRUMB_TELEMETRY_CONSTANTS.PAGE.CLASS_RESULTS_BY_ASSIGNMENT,
                    subpage: ITEM_ANALYSIS_CONSTANTS.EVENT_TYPE[subPageConstKey],
                    area: BREADCRUMB_TELEMETRY_CONSTANTS.AREA.DATA,
                };
                breadcrumbTelemetryService.sendTelemetryEvents(breadcrumbItem, $scope.programHierarchy, extensionKeys);
                if (featureManagementService.isShowBrowseTopnavEnabled()) {
                    $window.parent.location.href = $window.location.protocol +
                        '//' + $window.location.hostname + '/dashboard/' + url;
                } else {
                    $window.parent.location.href = $window.location.protocol +
                        '//' + $window.location.hostname + '/community/' + url;
                }
            };

            $scope.shouldDisplay = {
                standardsPaginationArrow: {
                    left: function() {
                        return $scope.standardAssignmentReportPage.pageNumber > 1;
                    },
                    right: function() {
                        return $scope.standardAssignmentReportPage.pageNumber <
                            $scope.standardAssignmentReportPage.totalPages;
                    }
                }
            };

            $scope.sortField = {
                identifier: $scope.HEADER_IDENTIFIER.name,
                ascending: false,
                standardIndex: -1
            };

            $scope.sortBy = function(fieldName, isPageLoading) {
                if (fieldName === $scope.sortField.identifier) {
                    $scope.sortField.ascending = !$scope.sortField.ascending;
                } else {
                    $scope.sortField.identifier = fieldName;
                    $scope.sortField.ascending = true;
                }
                if (!isPageLoading) {
                    saveAssignmentFieldPreference($scope.sortField.identifier);
                }
                return $scope.sortData($scope.studentsList);
            };

            $scope.sortData = function(studentsList) {
                $scope.studentsList = studentsList.sort(function(student1, student2) {
                    var comparisonResult;
                    switch ($scope.sortField.identifier) {
                    case $scope.HEADER_IDENTIFIER.name:
                        comparisonResult = MasteryByAssignmentService.nameComparator(student1, student2);
                        break;
                    case $scope.HEADER_IDENTIFIER.score:
                        comparisonResult = MasteryByAssignmentService.scoreComparator(student1, student2,
                            $scope.sortField.ascending);
                        break;
                    default:
                        comparisonResult = 0;
                    }
                    return comparisonResult;
                });
                if (!$scope.sortField.ascending) {
                    $scope.studentsList.reverse();
                }
            };

            var isSortByStandard = function(standardIndex) {
                return Number(standardIndex) === $scope.sortField.standardIndex;
            };

            var isSortByColumn = function(identifier, standardIndex) {
                if (!angular.isDefined(standardIndex)) {
                    return $scope.sortField.identifier === identifier;
                }
                return isSortByStandard(+standardIndex);
            };

            var isSortAscending = function(identifier, index) {
                return $scope.sortField.ascending && isSortByColumn(identifier, index);
            };

            var isSortDescending = function(identifier, index) {
                return !$scope.sortField.ascending && isSortByColumn(identifier, index);
            };

            $scope.getDirection = function(sortFieldName) {
                if (isSortDescending(sortFieldName)) {
                    return STANDARD_CONSTANTS.DIRECTION.UP;
                } else if (isSortAscending(sortFieldName)) {
                    return STANDARD_CONSTANTS.DIRECTION.DOWN;
                } else {
                    return STANDARD_CONSTANTS.DIRECTION.DEFAULT;
                }
            };

            $scope.indexForNonStandardColumn = -1;

            $scope.getAriaSortTitle = function(identifier, index) {
                var outputArray = [];
                if (identifier === $scope.HEADER_IDENTIFIER.name) {
                    outputArray.push(lwcI18nFilter('masteryRecap.columnHeader.name'));
                } else if (identifier === $scope.HEADER_IDENTIFIER.score) {
                    outputArray.push(lwcI18nFilter('masteryRecap.columnHeader.score'));
                } else if (identifier === $scope.HEADER_IDENTIFIER.proficiency) {
                    outputArray.push($scope.sortByScoreLabel);
                }
                outputArray.push(lwcI18nFilter('teacherItemAnalysis.sorting.sortableColumn'));
                if (identifier === $scope.sortField.identifier &&
                    index === $scope.sortField.standardIndex) {
                    if ($scope.sortField.ascending) {
                        outputArray.push(lwcI18nFilter('masteryByStandard.sorting.sortedAscending'));
                        outputArray.push(lwcI18nFilter('masteryByStandard.sorting.activateDescending'));
                    } else {
                        outputArray.push(lwcI18nFilter('masteryByStandard.sorting.sortedDescending'));
                        outputArray.push(lwcI18nFilter('masteryByStandard.sorting.activateAscending'));
                    }
                } else if (identifier === $scope.HEADER_IDENTIFIER.proficiency) {
                    if (!$scope.sortedScoreByDesc) {
                        outputArray.push(lwcI18nFilter('masteryByStandard.sorting.sortedAscending'));
                        outputArray.push(lwcI18nFilter('masteryByStandard.sorting.activateDescending'));
                    } else {
                        outputArray.push(lwcI18nFilter('masteryByStandard.sorting.sortedDescending'));
                        outputArray.push(lwcI18nFilter('masteryByStandard.sorting.activateAscending'));
                    }
                } else {
                    outputArray.push(lwcI18nFilter('masteryByStandard.sorting.activateAscending'));
                }
                return outputArray.join(', ');
            };
            var saveAssignmentFieldPreference = function(fieldName) {
                if (fieldName) {
                    $scope.assignmentFieldPreference.sortType = STANDARD_CONSTANTS.SORT_TYPE.DESC;
                    if ($scope.sortField.ascending && $scope.sortField.identifier === fieldName) {
                        $scope.assignmentFieldPreference.sortType = STANDARD_CONSTANTS.SORT_TYPE.ASC;
                    }
                    if (fieldName === STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.NAME) {
                        $scope.assignmentFieldPreference.sortField = STANDARD_CONSTANTS.SORT_FIELD.NAME;
                    } else if (fieldName === STANDARD_CONSTANTS.HEADER_COLUMN_IDENTIFIER.SCORE) {
                        $scope.assignmentFieldPreference.sortField = STANDARD_CONSTANTS.SORT_FIELD.SCORE;
                    }
                } else {
                    $scope.assignmentFieldPreference.standardProficiencySortType = STANDARD_CONSTANTS.SORT_TYPE.DESC;
                    if (!$scope.sortedScoreByDesc) {
                        $scope.assignmentFieldPreference.standardProficiencySortType = STANDARD_CONSTANTS.SORT_TYPE.ASC;
                    }
                }

                webStorage.add(STANDARD_CONSTANTS.STANDARD_MASTERY_BY_ASSIGNMENT + '.' +
                    $scope.currentUser.userId + '.' + $routeParams.classId + '.' + $scope.assessment.assessmentId,
                    $scope.assignmentFieldPreference);
            };
        }
    ]);
