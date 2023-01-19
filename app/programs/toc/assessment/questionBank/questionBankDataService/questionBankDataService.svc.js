angular.module('Realize.assessment.questionBankDataService', [
    'Realize.paths',
    'Realize.content.constants',
    'Realize.content.model.questionBank',
    'Realize.assessment.assessmentDataService',
    'Realize.assessment.questionBankResultService'
])
    .service('QuestionBankDataService', [
        '$http',
        '$log',
        '$q',
        'PATH',
        'CONTENT_CONSTANTS',
        'QuestionBank',
        'Assessment',
        'QuestionBankResultService',
        function($http, $log, $q, PATH, CONTENT_CONSTANTS, QuestionBank, Assessment,
                 QuestionBankResultService) {
            'use strict';

            var service = {},
                formatBankResult = function(questionBanks) {
                    var questionBankList = [];
                    if (questionBanks) {
                        _.each(questionBanks, function(questionBank) {
                            questionBankList.push(new QuestionBank(questionBank));
                        });
                    }
                    return questionBankList;
                };
            var activeTab;
            service.restoreSelectedQuestionBank = function(resultBanks, selectedBankSummary) {
                _.each(selectedBankSummary, function(bankSummary) {
                    var bank = _.find(resultBanks, function(resultBank) {
                        return resultBank.questionBankId === bankSummary.questionBankId;
                    });
                    if (bank) {
                        if (bankSummary.allQuestions === null) {
                            bankSummary.allQuestions =
                                (bank.questions.length === bankSummary.questionIds.length);
                        }
                        bank.selected = bankSummary.allQuestions;
                        _.each(bankSummary.questionIds, function(questionId) {
                            var bankQuestion = _.findWhere(bank.questions, {id: questionId});
                            if (bankQuestion) {
                                bankQuestion.selected = true;
                            }
                        });
                    }
                });
            };

            service.searchBanksByTopic = function(programs, keyword) {
                return service.getAvailableQuestionBanks({
                    'programs': programs,
                    'keyword': keyword,
                    'page': 1,
                    'pageSize': CONTENT_CONSTANTS.SEARCH_RESULT_PAGE_SIZE,
                    'calculateTotalAvailableQuestions': true
                });
            };

            service.getAvailableQuestionBanks = function(params) {
                return $http({
                    url: PATH.REST + '/assessment/questionbanks',
                    method: 'GET',
                    params: {
                        'programs': params.programs,
                        'keyword' : params.keyword,
                        'page'    : params.page,
                        'pageSize' : params.pageSize,
                        'calculateTotalAvailableQuestions' : params.calculateTotalAvailableQuestions,
                        'nativeBanks': false
                    }
                }).then(function(response) {
                    var result = response.data;
                    result.questionBanks = formatBankResult(result.questionBanks);
                    return result;
                }, function(err) {
                    $log.error('Failed to retrieve question banks', err);
                    return $q.reject('Failed to retrieve question banks', err);
                });
            };

            service.getQuestionsSummary = function(questionBank, programs) {
                QuestionBankResultService.summaryCallCompleted = false;
                return Assessment.getSummary(questionBank.assessmentSessionId, true, true, programs)
                    .then(function(response) {
                        if (response) {

                            QuestionBankResultService.questionBankSummaryCollection[questionBank.questionBankId] =
                                {
                                    questionBankId : questionBank.questionBankId,
                                    questions: questionBank.questions,
                                    sessionId: questionBank.assessmentSessionId,
                                    questionIds: response.questionIds,
                                    sequence: response.sequence,
                                    standards: response.standards
                                };
                            QuestionBankResultService.summaryCallCompleted = true;
                        }

                    }, function(error) {
                        $log.error('Failed to retrieve questions summary', error);
                        return $q.reject('Failed to retrieve questions summary', error);
                    });
            };

            service.setSearchQuestionBankActiveTab = function(activeTabValue) {
                activeTab = activeTabValue;
            };

            service.getSearchQuestionBankActiveTab = function() {
                return activeTab;
            };
            return service;
        }
    ]);
