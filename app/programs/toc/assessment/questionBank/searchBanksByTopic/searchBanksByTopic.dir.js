angular.module('Realize.assessment.searchBanksByTopicDirective', [
    'Realize.assessment.addQuestionBankCtrl',
    'Realize.paths',
    'Realize.analytics',
    'Realize.assessment.questionBankDataService',
    'Realize.assessment.assessmentDataService',
    'Realize.assessment.questionsInTestService'
])
    .directive('searchBanksByTopic', [
        '$log',
        'PATH',
        'Analytics',
        'QuestionBankDataService',
        'QuestionsInTestService',
        function($log, PATH, Analytics, QuestionBankDataService, QuestionsInTestService) {
            'use strict';

            return {
                templateUrl: PATH.TEMPLATE_CACHE + '/app/programs/toc/assessment/questionBank/searchBanksByTopic/' +
                    'searchBanksByTopic.dir.html',
                link: function(scope) {
                    var libraries = scope.currentProgram.library,
                        notifyNewSearchResult = function(result) {
                            scope.$emit('searchBanksByTopic.result.received', result, scope.bankKeyword);
                        },
                        searchAndNotifySearchResult = function() {
                            Analytics.track('track.action', {
                                category: 'Programs',
                                action: 'Build a test',
                                label: 'Search by topic (' + scope.bankKeyword + ')'
                            });
                            QuestionBankDataService.searchBanksByTopic(libraries, scope.bankKeyword)
                                .then(function(result) {
                                    scope.pageLoaded();
                                    notifyNewSearchResult(result);
                                },
                                function(err) {
                                    $log.error('Cannot retrieve question banks', err);
                                    scope.pageLoaded();
                                });
                        };
                    scope.search = function() {
                        scope.pageLoading();
                        QuestionsInTestService.putQuestionsInAssessment();
                        searchAndNotifySearchResult();
                        scope.searchBanksByTopicForm.$setPristine();
                    };
                }
            };
        }

    ]);
