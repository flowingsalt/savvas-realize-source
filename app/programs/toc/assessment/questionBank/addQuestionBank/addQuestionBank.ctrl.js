angular.module('Realize.assessment.addQuestionBankCtrl', [
    'Realize.content.constants',
    'rlzComponents.components.i18n',
    'Realize.user.currentUser',
    'Realize.paths',
    'Realize.analytics',
    'Realize.assessment.searchBanksByStandardDirective',
    'Realize.assessment.searchBanksByTopicDirective',
    'Realize.assessment.searchByStandardService',
    'Realize.assessment.searchQuestionBankDataService',
    'Realize.common.itemListDirective',
    'Realize.myContent.myContentDataService',
    'Realize.assessment.assessmentDataService',
    'Realize.assessment.questionsInTestService'
])
    .controller('AssessmentAddQuestionBankCtrl', [
        '$scope',
        '$rootScope',
        '$location',
        'lwcI18nFilter',
        '$log',
        '$routeParams',
        'Analytics',
        'CONTENT_CONSTANTS',
        'QuestionBankDataService',
        '$currentUser',
        'AssessmentInfo',
        'StandardsTreeData',
        'SearchByStandardService',
        'SearchQuestionBankDataService',
        'MyContent',
        'Assessment',
        'QuestionsInTestService',
        function($scope, $rootScope, $location, lwcI18nFilter, $log, $routeParams, Analytics, CONTENT_CONSTANTS,
                 QuestionBankDataService, $currentUser, AssessmentInfo, StandardsTreeData, SearchByStandardService,
                 SearchQuestionBankDataService, MyContent, Assessment, QuestionsInTestService) {
            'use strict';

            $scope.assessmentInfo = AssessmentInfo;
            QuestionsInTestService.assessmentId = AssessmentInfo.assessmentId;

            var navigationBackUrl = $location.search().backUrl;
            var updateResult = function(searchResult) {
                    var pageStart = ($scope.currentPage - 1) * $scope.pageSize;

                    $scope.searchResult = searchResult;
                    $scope.startIndex = pageStart + 1;
                    $scope.endIndex = pageStart + searchResult.questionBanks.length;
                    $scope.totalBanks = searchResult.totalQuestionBanks;
                },
                updateTotalQuestion = function(totalQuestionNumber) {
                    $scope.totalQuestions = totalQuestionNumber;
                },
                updateNewSearchForStandard = function(search) {
                    $scope.currentPage = 1;
                    $scope.currentSearch = {
                        standards: search.standards,
                        programLibraries: search.programLibraries
                    };
                },
                updateNewSearchForKeyword = function(search) {
                    $scope.currentPage = 1;
                    $scope.currentSearch = {
                        keyword: search.keyword,
                        programLibraries: search.programLibraries
                    };
                },
                updateAssessmentQuestionCount = function(newQuestionCount) {
                    $scope.assessmentInfo.questionCount = newQuestionCount;
                },
                requestNewPage = function(page) {
                    if ($scope.activeTab === 'searchByStandard') {
                        requestNewPageForStandard(page);
                    } else {
                        requestNewPageForKeyword(page);
                    }
                    return;
                },
                requestNewPageForStandard = function(page) {
                    var encodedStandards = SearchQuestionBankDataService.encodeStandards(
                                           $scope.currentSearch.standards);
                    var newPageParams = {
                        'programs': $scope.currentSearch.programLibraries,
                        'standards': encodedStandards,
                        'page': page,
                        'pageSize': $scope.pageSize,
                        'calculateTotalAvailableQuestions': false
                    };

                    return SearchQuestionBankDataService.getAvailableQuestionBanks(newPageParams)
                        .then(function(result) {
                            $scope.currentPage = page;
                            updateResult(result);
                            QuestionBankDataService.restoreSelectedQuestionBank(result.questionBanks,
                                QuestionsInTestService.doParseQuestionsInTestCollection());
                            $scope.pageLoaded();
                        });
                },
                requestNewPageForKeyword = function(page) {

                    var newPageParams = {
                        'programs': $scope.currentSearch.programLibraries,
                        'keyword': $scope.currentSearch.keyword,
                        'page': page,
                        'pageSize': $scope.pageSize,
                        'calculateTotalAvailableQuestions': false
                    };

                    return QuestionBankDataService.getAvailableQuestionBanks(newPageParams)
                        .then(function(result) {
                            $scope.currentPage = page;
                            updateResult(result);
                            QuestionBankDataService.restoreSelectedQuestionBank(result.questionBanks,
                                QuestionsInTestService.doParseQuestionsInTestCollection());
                            $scope.pageLoaded();
                        });
                },
                requestNavigateToBuilder = function() {
                    var assessmentId = QuestionsInTestService.assessmentId,
                        questions = QuestionsInTestService.transformQuestionsInTestCollection(),
                        isUpdatedTest = QuestionsInTestService.isQuestionsInTestCollectionChanged();

                    if (assessmentId && questions) {
                        $rootScope.pageLoading();
                        Assessment.putQuestionsInAssessment(assessmentId, questions)
                            .then(function() {
                                $rootScope.pageLoaded();
                                $scope.$emit('questionBankResult.addQuestion.done');
                                Assessment.updateEquellaItemTimestamp($scope.assessmentInfo.assessmentId);
                                if (isUpdatedTest && $scope.assessmentInfo && $scope.assessmentInfo.active === false &&
                                    $scope.assessmentInfo.originalId) {
                                    MyContent.makeDefaultView($scope.assessmentInfo.itemId, true, true);
                                    $scope.assessmentInfo.active = true;
                                }
                            }, function(error) {
                                $rootScope.pageLoaded();
                                $log.error('Failed to load questions for an assessment', error);
                            });
                    }
                    QuestionsInTestService.questionsInAssessment = questions;

                },
                resetSelectedQuestions = function() {
                    $scope.hasResult = false;
                    $scope.hasPerformedSearch = false;
                },
                onSearchComplete = function(event, searchResult) {
                    $log.log('New search result', searchResult);
                    $scope.hasPerformedSearch = true;

                    QuestionBankDataService.restoreSelectedQuestionBank(searchResult.questionBanks,
                        QuestionsInTestService.doParseQuestionsInTestCollection());
                    $scope.$broadcast('addQuestionBank.selectedQuestion.reset');

                    if (searchResult.totalQuestionBanks !== 0) {
                        $scope.hasResult = true;

                        updateResult(searchResult);
                        updateTotalQuestion(searchResult.totalQuestionsAvailable);
                    } else {
                        $scope.hasResult = false;
                        $scope.searchResult = null;
                    }
                },
                analyticsForAddQuestionBankCtrl = function(description) {
                    Analytics.track('track.action', {
                        category: 'Programs',
                        action: 'Build a test',
                        label: description
                    });
                };

            $scope.standardsTreeData = StandardsTreeData;
            $scope.activeTab = 'searchByStandard';
            QuestionBankDataService.setSearchQuestionBankActiveTab('searchByStandard');
            $scope.hasPerformedSearch = false;
            $scope.currentPage = 1;
            $scope.pageSize = CONTENT_CONSTANTS.SEARCH_RESULT_PAGE_SIZE;

            $scope.searchCompleted = function() {
                return $scope.hasPerformedSearch && $scope.hasResult;
            };

            $scope.getSelectedStandards = function() {
                return SearchByStandardService.getSelectedStandardList();
            };

            $scope.showTab = function(tab) {
                QuestionsInTestService.putQuestionsInAssessment();
                $scope.activeTab = tab;
                QuestionBankDataService.setSearchQuestionBankActiveTab(tab);
                resetSelectedQuestions();
            };

            $scope.back = function() {
                var myLibraryRegex = /\/myLibrary\/program/;
                $location.search('lastSelectedGrade', null);
                var fallback = $location.path().split('/assessment/')[0],
                    flag = $location.path().indexOf('insert') > -1 ? false : true;
                if (myLibraryRegex.test(fallback)) {
                    fallback = '/myLibrary';
                }
                $scope.goBack(fallback, flag);
            };

            $scope.getQuestionCount = function() {
                var selectedQuestions = QuestionsInTestService.getQuestionsInTestCollection();
                return (selectedQuestions.questions || []).length;
            };

            $scope.firstVisit = {
                showAlert: !$currentUser.getAttribute('addQuestionBank.info.seen'),
                title: lwcI18nFilter('questionBank.firstVisitInfo.title'),
                description: lwcI18nFilter('questionBank.firstVisitInfo.description'),
                closeFn: function() {
                    $currentUser.setAttribute('addQuestionBank.info.seen', true);
                    $scope.firstVisit.showAlert = false;
                }
            };

            $scope.$on('itemListDirective.removeItem', function(event, item) {
                analyticsForAddQuestionBankCtrl('Remove standard');
                SearchByStandardService.removeStandard(item);
                $scope.$emit('AssessmentAddQuestionBankCtrl.removeStandard', event);
            });

            $scope.newStandardSearch = function() {
                analyticsForAddQuestionBankCtrl('Start new search');
                $scope.showTab('searchByStandard');
                $routeParams.lastSelectedGrade = null;
            };

            $scope.doneAdding = function() {
                analyticsForAddQuestionBankCtrl('I\'m done adding questions');
                requestNavigateToBuilder();
            };

            $scope.$on('questionBankResult.addQuestion.done', function() {
                $location.url($location.path());
                var basePath = $location.path().split('/addQuestionBank')[0];
                $location.path(basePath + '/edit');
                if (navigationBackUrl) {
                    $location.search('backUrl', navigationBackUrl);
                }
            });

            $scope.$on('questionBankResult.page.change', function(event, newPage) {
                $scope.pageLoading();
                requestNewPage(newPage);
            });

            $scope.$on('questionBankResult.question.added', function(event, assessmentQuestionCount) {
                updateAssessmentQuestionCount(assessmentQuestionCount);
                if ($scope.assessmentInfo.active === false && $scope.assessmentInfo.originalId) {
                    MyContent.makeDefaultView($scope.assessmentInfo.itemId, true, true);
                    $scope.assessmentInfo.active = true;
                }

            });

            $scope.$on('searchBanksByTopic.result.received', function(event, searchResult, keyword) {
                updateNewSearchForKeyword({
                    keyword: keyword,
                    programLibraries: $scope.currentProgram.library
                });
                onSearchComplete(event, searchResult);
            });

            SearchByStandardService.selectedStandardListIdResult = [];
            $scope.$on('searchBanksByStandard.result.received', function(event, searchResult, selectedStandardListId) {
                event.preventDefault();
                if (!_.isEqual(SearchByStandardService.selectedStandardListIdResult, selectedStandardListId)) {
                    updateNewSearchForStandard({
                        standards: selectedStandardListId,
                        programLibraries: $scope.currentProgram.library
                    });
                    onSearchComplete(event, searchResult);
                }
                SearchByStandardService.selectedStandardListIdResult = selectedStandardListId;
            });
        }
    ]);
